import WageWizard from "./wagewizard.js";

const copyToClipboard = (text, button) => {
  if (!navigator.clipboard) return;

  const originalHTML = button.innerHTML;
  const tooltip = bootstrap.Tooltip.getInstance(button);
  navigator.clipboard.writeText(text).then(() => {
    button.innerHTML = WageWizard.icons.check;
    if (tooltip) tooltip.setContent({ ".tooltip-inner": WageWizard.messages.copied_to_clipboard });
    setTimeout(() => {
      button.innerHTML = originalHTML;
      if (tooltip) tooltip.setContent({ ".tooltip-inner": WageWizard.messages.copy_to_clipboard });
    }, 2000);
  });
};

WageWizard.copyToClipboard = copyToClipboard;
