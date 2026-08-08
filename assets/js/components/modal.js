const modalRoot = document.querySelector("#modal-root");

export function modal(title, body, { large = false, footer = "" } = {}) {
  modalRoot.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal ${large ? "large" : ""}">
        <div class="modal-head">
          <h2>${title}</h2>
          <button class="close" type="button" data-close>×</button>
        </div>

        <div class="modal-body">
          ${body}
        </div>

        ${footer ? `<div class="modal-foot">${footer}</div>` : ""}
      </div>
    </div>
  `;

  modalRoot.querySelectorAll("[data-close]").forEach((button) => {
    button.onclick = closeModal;
  });

  modalRoot.querySelector(".modal-backdrop").onclick = (event) => {
    if (event.target.classList.contains("modal-backdrop")) {
      closeModal();
    }
  };
}

export function closeModal() {
  modalRoot.innerHTML = "";
}
