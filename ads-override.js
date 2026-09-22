// Advertising copy override for OH HELL! — loaded after translations.js and before languages.js.
(() => {
  const t = window.SITE_TRANSLATIONS;
  if (!t) return;

  const adsText = {
    fr: "Des publicités peuvent être affichées au cours des parties via Unity LevelPlay. Elles permettent de maintenir le jeu gratuit.",
    co: "E publicità ponu esse mustrate durante e partite via Unity LevelPlay. Permettenu di mantene u ghjocu di rigalu.",
    en: "Ads may be shown during games through Unity LevelPlay. They help keep the game free.",
    de: "Während einer Partie kann über Unity LevelPlay Werbung angezeigt werden. Sie hilft dabei, das Spiel kostenlos anzubieten.",
    es: "Pueden mostrarse anuncios durante las partidas mediante Unity LevelPlay. Ayudan a mantener el juego gratuito.",
    it: "Durante le partite possono essere mostrati annunci tramite Unity LevelPlay. Aiutano a mantenere il gioco gratuito.",
    "pt-BR": "Anúncios podem ser exibidos durante as partidas pelo Unity LevelPlay. Eles ajudam a manter o jogo gratuito.",
    "zh-Hans": "游戏过程中可能会通过 Unity LevelPlay 展示广告，以帮助维持游戏免费提供。",
    ja: "ゲーム中に Unity LevelPlay の広告が表示される場合があります。広告はゲームを無料で提供し続けるために役立ちます。",
    ko: "게임 중 Unity LevelPlay를 통해 광고가 표시될 수 있습니다. 광고는 게임을 무료로 유지하는 데 도움이 됩니다."
  };

  Object.entries(adsText).forEach(([lang, text]) => {
    if (t[lang]) t[lang].adsText = text;
  });
})();
