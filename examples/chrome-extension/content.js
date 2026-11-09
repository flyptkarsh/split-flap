// Content scripts run in an isolated world where `customElements` is null,
// so use createSplitFlap() (plain class) instead of <split-flap>.
const box = document.createElement("div");
box.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647";
document.documentElement.append(box);

const board = SplitFlapLib.createSplitFlap(box, {
  lines: ["EXTENSION ACTIVE", document.title.slice(0, 16)],
  cols: 16, size: 18, theme: "black", sound: false,
});
// Update later: board.lines = [...]; board.theme = "white"; board.destroy();
