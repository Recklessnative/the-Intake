// Mieke's first-look bubbles (one per screen, the first time it is in front of you) sit on top of
// whatever the tests click next. Tests that are not about them put each one away as it appears;
// the older hints (`hint-…`) are left alone, the smoke test checks those itself.
module.exports = page => page.addInitScript(() => {
  setInterval(() => {
    const b = document.querySelector('.tour.tip[data-look^="look-"] #tour-next');
    if (b) b.click();
  }, 150);
});
