import * as Sentry from "@sentry/browser";

const body = document.getElementsByTagName("body");

export class ContactForm {
  constructor(element) {
    this.form = element;
    this.liveRegion = document.getElementById("live-region");
    this.formContent = this.form.querySelector("[data-form-content]");
    this.loading = this.form.querySelector("[data-form-loading]");
    this.error = this.form.querySelector("[data-form-error]");
    this.success = this.form.querySelector("[data-form-success]");
    this.reset = this.form.querySelectorAll("[data-reset-form]");

    this.bindEvents();
  }

  bindEvents() {
    this.form.addEventListener("submit", event => {
      event.preventDefault();
      this.updateFormState("loading", "Your message is being sent...");

      const formData = new FormData(this.form);
      this.sendMessage(Object.fromEntries(formData.entries()));
    });

    this.reset.forEach(reset => {
      reset.addEventListener("click", () => {
        this.updateFormState("initial");
      });
    });
  }

  sendMessage(formData) {
    const handleError = () => {
      this.updateFormState("error", "An error occurred.");
      if (window.location.host === "mainmatter.com") {
        Sentry.addBreadcrumb({
          category: "post",
          message: "Submit Contact Form",
          level: "info",
          data: formData,
        });
        Sentry.captureException(new Error("Failed to deliver message via contact form!"));
      }
    };

    const { plausible } = window;
    if (plausible) {
      plausible("Contact");
    }

    return fetch("https://contact.mainmatter.dev/send", {
      body: JSON.stringify(formData),
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json; charset=UTF-8'",
      },
      method: "POST",
      mode: "cors",
    })
      .then(response => {
        if (response.ok) {
          this.updateFormState("success", "Message sent successfully.");
        } else {
          handleError();
        }
      })
      .catch(() => {
        handleError();
      });
  }

  updateFormState(state, screenreaderAnnouncement) {
    // Technically we shouldn't need to double announce, moving focus should just read the text,
    // but NVDA presently has a bug where moving focus in a 'replaced' element doesn't announce things:
    // https://github.com/nvaccess/nvda/issues/5825
    this.liveRegion.innerText = screenreaderAnnouncement || "";

    if (state === "initial") {
      this.formContent.removeAttribute("inert");
      body[0].classList.remove("modal-active");
      this.form.reset();
    } else {
      this.formContent.setAttribute("inert", true);
      body[0].classList.add("modal-active");
    }

    this.form.setAttribute("data-status", state);

    if (state === "error") {
      setTimeout(() => this.error.focus(), 200);
    } else if (state === "success") {
      setTimeout(() => this.success.focus(), 200);
    } else if (state === "initial") {
      setTimeout(() => this.formContent.focus(), 200);
    }
  }
}
