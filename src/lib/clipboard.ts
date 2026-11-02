export async function writeClipboardText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Browsers may deny the asynchronous clipboard API; try the legacy path.
  }
  const textarea = document.createElement("textarea");
  const previousFocus = document.activeElement;
  try {
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
  }
}
