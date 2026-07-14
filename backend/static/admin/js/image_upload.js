(function () {
  "use strict";

  function getCookie(name) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : "";
  }

  function csrfToken() {
    const input = document.querySelector("[name=csrfmiddlewaretoken]");
    return (input && input.value) || getCookie("csrftoken") || "";
  }

  async function uploadFile(uploadUrl, file, options) {
    options = options || {};
    const body = new FormData();
    body.append("file", file, file.name || "paste.jpg");
    body.append("subdir", options.subdir || "images");
    body.append("mode", options.mode || "contain");
    const response = await fetch(uploadUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-CSRFToken": csrfToken() },
      body: body,
    });
    const data = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      throw new Error(data.detail || "Upload failed");
    }
    return data.url;
  }

  function dropzoneOptions(root) {
    return {
      subdir: root.getAttribute("data-subdir") || "images",
      mode: root.getAttribute("data-mode") || "contain",
    };
  }

  function setPreview(root, url) {
    const preview = root.querySelector(".kedi-dropzone-preview");
    const clearBtn = root.querySelector(".kedi-dropzone-clear");
    const urlInput = root.querySelector("[data-kedi-image-url]");
    if (!preview || !urlInput) return;

    urlInput.value = url || "";
    preview.classList.toggle("is-empty", !url);

    let img = preview.querySelector(".kedi-dropzone-img");
    let placeholder = preview.querySelector(".kedi-dropzone-placeholder");

    if (url) {
      if (!img) {
        img = document.createElement("img");
        img.className = "kedi-dropzone-img";
        img.alt = "";
        preview.insertBefore(img, preview.firstChild);
      }
      img.onerror = function () {
        img.remove();
        preview.classList.add("is-empty");
        if (clearBtn) clearBtn.hidden = true;
      };
      img.src = url;
      if (placeholder) placeholder.remove();
      if (clearBtn) clearBtn.hidden = false;
    } else {
      if (img) img.remove();
      if (!placeholder) {
        placeholder = document.createElement("div");
        placeholder.className = "kedi-dropzone-placeholder";
        const mode = root.getAttribute("data-mode") || "contain";
        const sub =
          mode === "square"
            ? "Auto-fit to square shop layout (1200×1200)"
            : "Auto-resized for the web";
        placeholder.innerHTML =
          '<span class="material-symbols-outlined">add_photo_alternate</span>' +
          "<strong>Drop, paste, or browse</strong>" +
          "<span>" +
          sub +
          "</span>";
        preview.insertBefore(placeholder, preview.firstChild);
      }
      if (clearBtn) clearBtn.hidden = true;
    }
  }

  function setBusy(root, busy) {
    const el = root.querySelector(".kedi-dropzone-busy");
    if (el) el.hidden = !busy;
    root.classList.toggle("is-busy", !!busy);
  }

  async function handleFiles(root, fileList) {
    const uploadUrl = root.getAttribute("data-upload-url");
    if (!uploadUrl) {
      window.alert("Upload URL is not configured.");
      return;
    }
    const files = Array.from(fileList || []).filter(function (f) {
      return f && f.type && f.type.indexOf("image/") === 0;
    });
    if (!files.length) return;

    setBusy(root, true);
    try {
      const url = await uploadFile(uploadUrl, files[0], dropzoneOptions(root));
      setPreview(root, url);
      root.dispatchEvent(new CustomEvent("kedi:image-uploaded", { bubbles: true, detail: { url: url } }));
    } catch (err) {
      window.alert(err.message || "Could not upload image");
    } finally {
      setBusy(root, false);
    }
  }

  function bindDropzone(root) {
    if (root.dataset.bound === "1") return;
    root.dataset.bound = "1";

    const fileInput = root.querySelector(".kedi-dropzone-file");
    const browse = root.querySelector(".kedi-dropzone-browse");
    const clearBtn = root.querySelector(".kedi-dropzone-clear");
    const preview = root.querySelector(".kedi-dropzone-preview");
    const urlInput = root.querySelector("[data-kedi-image-url]");

    if (browse && fileInput) {
      browse.addEventListener("click", function (e) {
        e.preventDefault();
        fileInput.click();
      });
    }
    if (preview && fileInput) {
      preview.addEventListener("click", function () {
        fileInput.click();
      });
    }
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        handleFiles(root, fileInput.files);
        fileInput.value = "";
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function (e) {
        e.preventDefault();
        setPreview(root, "");
      });
    }
    if (urlInput) {
      urlInput.addEventListener("change", function () {
        setPreview(root, urlInput.value.trim());
      });
    }

    ["dragenter", "dragover"].forEach(function (evt) {
      root.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        root.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      root.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        root.classList.remove("is-dragover");
      });
    });
    root.addEventListener("drop", function (e) {
      handleFiles(root, e.dataTransfer && e.dataTransfer.files);
    });

    root.addEventListener("paste", function (e) {
      const items = (e.clipboardData && e.clipboardData.items) || [];
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image/") === 0) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length) {
        e.preventDefault();
        handleFiles(root, files);
      }
    });
  }

  function emptyDropzones() {
    return Array.from(document.querySelectorAll(".kedi-dropzone")).filter(function (z) {
      const input = z.querySelector("[data-kedi-image-url]");
      return input && !input.value.trim() && !z.classList.contains("is-busy");
    });
  }

  function clickAddImageRow() {
    const group =
      document.querySelector("#images-group") ||
      document.querySelector(".inline-group[id*='image']") ||
      document.querySelector("[data-inline-model='shop-productimage']");
    if (!group) return false;
    const add = group.querySelector(".add-row a, a.add-row, .addlink");
    if (add) {
      add.click();
      return true;
    }
    return false;
  }

  async function fillNextDropzone(file, uploadUrl) {
    let targets = emptyDropzones();
    if (!targets.length) {
      clickAddImageRow();
      await new Promise(function (r) {
        setTimeout(r, 80);
      });
      targets = emptyDropzones();
    }
    const target = targets[0];
    if (!target) {
      throw new Error("Add another image row first, then try again.");
    }
    if (uploadUrl) target.setAttribute("data-upload-url", uploadUrl);
    setBusy(target, true);
    try {
      const url = await uploadFile(
        target.getAttribute("data-upload-url"),
        file,
        dropzoneOptions(target)
      );
      setPreview(target, url);
    } finally {
      setBusy(target, false);
    }
  }

  function ensureMultiDrop(uploadUrl) {
    if (!uploadUrl || document.querySelector(".kedi-multi-drop")) return;

    const group =
      document.querySelector("#images-group") ||
      document.querySelector(".inline-group[id*='image']");
    if (!group) return;

    const banner = document.createElement("div");
    banner.className = "kedi-multi-drop";
    banner.innerHTML =
      '<div class="kedi-multi-drop-copy">' +
      "<strong>Add product photos</strong>" +
      "<span>Drag & drop multiple images here, or paste (Ctrl+V). Each is auto-resized for the shop.</span>" +
      "</div>" +
      '<button type="button" class="kedi-multi-browse">Upload images</button>' +
      '<input type="file" accept="image/*" multiple hidden class="kedi-multi-file" />';

    const heading = group.querySelector("h2, h3, .inline-heading") || group.firstChild;
    if (heading && heading.parentNode === group) {
      group.insertBefore(banner, heading.nextSibling);
    } else {
      group.insertBefore(banner, group.firstChild);
    }

    const fileInput = banner.querySelector(".kedi-multi-file");
    banner.querySelector(".kedi-multi-browse").addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", async function () {
      const files = Array.from(fileInput.files || []);
      fileInput.value = "";
      for (const file of files) {
        if (!file.type || file.type.indexOf("image/") !== 0) continue;
        try {
          await fillNextDropzone(file, uploadUrl);
        } catch (err) {
          window.alert(err.message || "Upload failed");
          break;
        }
      }
    });

    ["dragenter", "dragover"].forEach(function (evt) {
      banner.addEventListener(evt, function (e) {
        e.preventDefault();
        banner.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      banner.addEventListener(evt, function (e) {
        e.preventDefault();
        banner.classList.remove("is-dragover");
      });
    });
    banner.addEventListener("drop", async function (e) {
      const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
      for (const file of files) {
        if (!file.type || file.type.indexOf("image/") !== 0) continue;
        try {
          await fillNextDropzone(file, uploadUrl);
        } catch (err) {
          window.alert(err.message || "Upload failed");
          break;
        }
      }
    });

    document.addEventListener("paste", async function (e) {
      const active = document.activeElement;
      if (active && active.closest && active.closest(".kedi-dropzone")) return;
      if (!document.body.contains(banner)) return;
      const items = (e.clipboardData && e.clipboardData.items) || [];
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image/") === 0) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (!files.length) return;
      e.preventDefault();
      for (const file of files) {
        try {
          await fillNextDropzone(file, uploadUrl);
        } catch (err) {
          window.alert(err.message || "Upload failed");
          break;
        }
      }
    });
  }

  function boot() {
    const zones = document.querySelectorAll(".kedi-dropzone");
    zones.forEach(bindDropzone);
    const first = zones[0];
    const uploadUrl = first && first.getAttribute("data-upload-url");
    if (uploadUrl) ensureMultiDrop(uploadUrl);
  }

  document.addEventListener("DOMContentLoaded", boot);
  document.addEventListener("formset:added", function () {
    setTimeout(boot, 0);
  });
  // Dynamic Unfold/Django inline rows
  let bootTimer = null;
  const observer = new MutationObserver(function () {
    if (bootTimer) clearTimeout(bootTimer);
    bootTimer = setTimeout(boot, 50);
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
