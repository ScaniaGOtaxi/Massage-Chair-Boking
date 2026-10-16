
(() => {
  const bar = document.getElementById('qfsv-install');
  const button = document.getElementById('qfsv-install-button');
  const status = document.getElementById('qfsv-install-status');
  const dialog = document.getElementById('qfsv-install-help');
  const instructions = document.getElementById('qfsv-install-instructions');

  if (!bar || !button || !dialog) return;

  const media = window.matchMedia('(display-mode: standalone)');
  let pending = null;
  let busy = false;
  let installed = false;

  const standalone = () =>
    installed || media.matches || navigator.standalone === true;

  const update = () => {
    bar.hidden = standalone();
    button.disabled = busy;
  };

  const showHelp = () => {
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' &&
       navigator.maxTouchPoints > 1);

    instructions.textContent = ios
      ? 'På iPhone eller iPad: öppna denna sida i Safari. Tryck på Dela och välj Lägg till på hemskärmen. Aktivera Öppna som webbapp om valet visas och tryck Lägg till.'
      : 'I Chrome eller Edge: öppna webbläsarens meny med tre punkter och leta efter Installera app eller Appar → Installera den här webbplatsen som en app. Du kan också använda installationsikonen i adressfältet. Om valet saknas, prova Chrome eller Edge och öppna sidan direkt där.';

    if (!dialog.open) dialog.showModal();
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pending = event;
    status.textContent =
      'Installera för att öppna bokningen direkt från hemskärmen.';
    update();
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    pending = null;
    if (dialog.open) dialog.close();
    update();
  });

  media.addEventListener('change', update);

  button.addEventListener('click', async () => {
    if (busy || standalone()) return;

    if (!pending) {
      showHelp();
      return;
    }

    const event = pending;
    pending = null;
    busy = true;
    status.textContent = 'Öppnar installationen…';
    update();

    try {
      await event.prompt();
      const choice = await event.userChoice;

      status.textContent = choice.outcome === 'accepted'
        ? 'Installationen har begärts. Följ webbläsarens anvisningar.'
        : 'Du kan installera appen senare när du vill.';
    } catch {
      status.textContent =
        'Öppna installationshjälpen och prova via webbläsarens meny.';
      showHelp();
    } finally {
      busy = false;
      update();
    }
  });

  document.getElementById('qfsv-install-close')
    .addEventListener('click', () => dialog.close());

  dialog.addEventListener('close', () => {
    if (!standalone()) button.focus();
  });

  update();
})();
