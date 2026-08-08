const toastRoot = document.querySelector("#toast-root");

export function toast(message) {
  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;

  toastRoot.append(element);

  setTimeout(() => {
    element.remove();
  }, 2600);
}
