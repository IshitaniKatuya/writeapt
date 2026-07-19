(function () {
  const KID_COLORS = [
    "#e53935", "#fb8c00", "#fdd835",
    "#43a047", "#1e88e5", "#8e24aa",
  ];

  const practiceText = document.getElementById("practice-text");
  const fontSizeInput = document.getElementById("font-size");
  const lineHeightInput = document.getElementById("line-height");
  const strokeWidthInput = document.getElementById("stroke-width");
  const guideOpacityInput = document.getElementById("guide-opacity");
  const imageScaleInput = document.getElementById("image-scale");
  const imagePosXInput = document.getElementById("image-pos-x");
  const imagePosYInput = document.getElementById("image-pos-y");
  const btnClear = document.getElementById("btn-clear");
  const btnUndo = document.getElementById("btn-undo");
  const btnRemoveImage = document.getElementById("btn-remove-image");
  const btnConfirmImage = document.getElementById("btn-confirm-image");
  const btnReeditImage = document.getElementById("btn-reedit-image");
  const btnImageBigger = document.getElementById("btn-image-bigger");
  const btnImageSmaller = document.getElementById("btn-image-smaller");
  const imageInput = document.getElementById("image-input");
  const imageEditBar = document.getElementById("image-edit-bar");
  const canvasWrapper = document.getElementById("canvas-wrapper");
  const guideCanvas = document.getElementById("guide-canvas");
  const drawCanvas = document.getElementById("draw-canvas");
  const colorPalette = document.getElementById("color-palette");
  const toolButtons = document.querySelectorAll("[data-tool]");
  const layerButtons = document.querySelectorAll("[data-layer]");

  const guideCtx = guideCanvas.getContext("2d");
  const drawCtx = drawCanvas.getContext("2d");

  let dpr = 1;
  let isDrawing = false;
  let lastPoint = null;
  const actionHistory = [];
  let currentTool = "pen";
  let currentColor = KID_COLORS[0];
  let guideImage = null;
  let guideLayer = "back";
  let textUpdateTimer = null;
  let imageTransform = {
    scaleMult: 1,
    offsetXRatio: 0,
    offsetYRatio: 0,
    locked: false,
  };
  let isDraggingImage = false;
  let imageDragStart = null;

  function getSettings() {
    return {
      text: practiceText.value,
      fontSize: Number(fontSizeInput.value),
      lineHeight: Number(lineHeightInput.value),
      strokeWidth: Number(strokeWidthInput.value),
      guideOpacity: Number(guideOpacityInput.value),
    };
  }

  function isImageMode() {
    return Boolean(guideImage);
  }

  function isImageEditActive() {
    return isImageMode() && !imageTransform.locked;
  }

  function isColorImageMode() {
    return isImageMode() && guideLayer === "front";
  }

  function syncTransformToHiddenInputs() {
    imageScaleInput.value = Math.round(imageTransform.scaleMult * 100);
    imagePosXInput.value = Math.round(imageTransform.offsetXRatio * 100);
    imagePosYInput.value = Math.round(imageTransform.offsetYRatio * 100);
  }

  function changeImageScale(delta) {
    imageTransform.scaleMult = Math.max(0.2, Math.min(3, imageTransform.scaleMult + delta));
    syncTransformToHiddenInputs();
    drawGuide();
  }

  function updateImageEditUI() {
    const hasImage = isImageMode();
    const editing = isImageEditActive();

    imageEditBar.classList.toggle("hidden", !editing);
    canvasWrapper.classList.toggle("canvas-wrapper--image-edit", editing);
    btnRemoveImage.classList.toggle("hidden", !hasImage);
    btnReeditImage.classList.toggle("hidden", !hasImage || editing);
  }

  function resetImageTransform() {
    imageTransform = {
      scaleMult: 1,
      offsetXRatio: 0,
      offsetYRatio: 0,
      locked: false,
    };
    syncTransformToHiddenInputs();
  }

  function confirmImage() {
    if (!guideImage) return;
    imageTransform.locked = true;
    isDraggingImage = false;
    canvasWrapper.classList.remove("canvas-wrapper--dragging");
    updateImageEditUI();
  }

  function reeditImage() {
    if (!guideImage) return;
    imageTransform.locked = false;
    updateImageEditUI();
  }

  function getImageBaseScale() {
    const padding = 16 * dpr;
    const maxW = guideCanvas.width - padding * 2;
    const maxH = guideCanvas.height - padding * 2;
    return Math.min(maxW / guideImage.width, maxH / guideImage.height);
  }

  function getImageLayout() {
    const baseScale = getImageBaseScale();
    const scale = baseScale * imageTransform.scaleMult;
    const drawW = Math.max(1, Math.floor(guideImage.width * scale));
    const drawH = Math.max(1, Math.floor(guideImage.height * scale));
    const centerX = guideCanvas.width / 2;
    const centerY = guideCanvas.height / 2;
    const offsetX = imageTransform.offsetXRatio * (guideCanvas.width / 2);
    const offsetY = imageTransform.offsetYRatio * (guideCanvas.height / 2);
    return {
      drawW,
      drawH,
      x: centerX - drawW / 2 + offsetX,
      y: centerY - drawH / 2 + offsetY,
    };
  }

  function setTool(tool) {
    currentTool = tool;
    toolButtons.forEach((btn) => {
      const active = btn.dataset.tool === tool;
      btn.classList.toggle("big-btn--active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    drawCanvas.classList.toggle("cursor-fill", tool === "fill" && !isImageEditActive());
  }

  function setGuideLayer(layer) {
    guideLayer = layer;
    layerButtons.forEach((btn) => {
      const active = btn.dataset.layer === layer;
      btn.classList.toggle("big-btn--active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    canvasWrapper.classList.toggle("canvas-wrapper--guide-front", layer === "front");
    canvasWrapper.classList.toggle("canvas-wrapper--guide-back", layer === "back");
    drawGuide();
  }

  function setColor(color) {
    currentColor = color;
    colorPalette.querySelectorAll(".palette__color").forEach((btn) => {
      btn.classList.toggle("palette__color--active", btn.dataset.color === color);
    });
  }

  function buildPalette() {
    KID_COLORS.forEach((color, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette__color";
      btn.dataset.color = color;
      btn.style.background = color;
      btn.setAttribute("aria-label", `いろ ${index + 1}`);
      btn.addEventListener("click", () => setColor(color));
      colorPalette.appendChild(btn);
    });
    setColor(KID_COLORS[0]);
  }

  function resizeCanvases() {
    const rect = canvasWrapper.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    for (const canvas of [guideCanvas, drawCanvas]) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    drawGuide();
    redrawActions();
  }

  function drawGuideText() {
    guideCtx.setTransform(1, 0, 0, 1, 0, 0);
    guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);

    const { text, fontSize, lineHeight, guideOpacity } = getSettings();
    if (!text.trim()) return;

    const scaledFontSize = fontSize * dpr;
    const padding = 24 * dpr;
    const lineGap = scaledFontSize * lineHeight;
    const centerX = guideCanvas.width / 2;

    guideCtx.font = `${scaledFontSize}px "Noto Sans JP", sans-serif`;
    guideCtx.fillStyle = `rgba(100, 96, 90, ${guideOpacity})`;
    guideCtx.textAlign = "center";
    guideCtx.textBaseline = "top";

    const lines = text.split("\n");
    const totalHeight = lines.length * lineGap;
    let y = Math.max(padding, (guideCanvas.height - totalHeight) / 2);

    for (const line of lines) {
      if (y + scaledFontSize > guideCanvas.height - padding) break;
      guideCtx.fillText(line, centerX, y);
      y += lineGap;
    }
  }

  function toGrayscale(image, width, height) {
    const temp = document.createElement("canvas");
    temp.width = width;
    temp.height = height;
    const tempCtx = temp.getContext("2d");
    tempCtx.drawImage(image, 0, 0, width, height);
    try {
      const imageData = tempCtx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      tempCtx.putImageData(imageData, 0, 0);
    } catch {
      // getImageData失敗時はそのまま
    }
    return temp;
  }

  function drawGuideImage() {
    guideCtx.setTransform(1, 0, 0, 1, 0, 0);
    guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    if (!guideImage) return;

    const { guideOpacity } = getSettings();
    const { drawW, drawH, x, y } = getImageLayout();

    if (isColorImageMode()) {
      guideCtx.globalAlpha = 1;
      guideCtx.drawImage(guideImage, x, y, drawW, drawH);
    } else {
      const gray = toGrayscale(guideImage, drawW, drawH);
      guideCtx.globalAlpha = guideOpacity;
      guideCtx.drawImage(gray, x, y);
    }
    guideCtx.globalAlpha = 1;
  }

  function drawGuide() {
    if (isImageMode()) {
      drawGuideImage();
    } else {
      drawGuideText();
    }
  }

  function scheduleTextGuideUpdate() {
    clearTimeout(textUpdateTimer);
    textUpdateTimer = setTimeout(drawGuide, 120);
  }

  function drawStroke(stroke) {
    if (stroke.points.length < 2) return;
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawCtx.strokeStyle = stroke.color;
    drawCtx.lineWidth = stroke.points[0].width;
    drawCtx.beginPath();
    drawCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      drawCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    drawCtx.stroke();
  }

  function hexToRgba(hex) {
    const value = hex.replace("#", "");
    const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255, a: 255 };
  }

  function colorsMatch(a, b, tolerance) {
    return (
      Math.abs(a.r - b.r) <= tolerance &&
      Math.abs(a.g - b.g) <= tolerance &&
      Math.abs(a.b - b.b) <= tolerance &&
      Math.abs(a.a - b.a) <= tolerance
    );
  }

  function floodFill(startX, startY, fillColor) {
    const imageData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    const { data, width, height } = imageData;
    const x = Math.floor(startX);
    const y = Math.floor(startY);
    if (x < 0 || y < 0 || x >= width || y >= height) return null;

    const startIndex = (y * width + x) * 4;
    const target = {
      r: data[startIndex],
      g: data[startIndex + 1],
      b: data[startIndex + 2],
      a: data[startIndex + 3],
    };
    const fill = hexToRgba(fillColor);
    if (colorsMatch(target, fill, 0)) return null;

    const stack = [[x, y]];
    const visited = new Uint8Array(width * height);

    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      const pixelIndex = cy * width + cx;
      if (visited[pixelIndex]) continue;
      visited[pixelIndex] = 1;

      const index = pixelIndex * 4;
      const current = {
        r: data[index],
        g: data[index + 1],
        b: data[index + 2],
        a: data[index + 3],
      };
      if (!colorsMatch(current, target, 32)) continue;

      data[index] = fill.r;
      data[index + 1] = fill.g;
      data[index + 2] = fill.b;
      data[index + 3] = 255;

      if (cx > 0) stack.push([cx - 1, cy]);
      if (cx < width - 1) stack.push([cx + 1, cy]);
      if (cy > 0) stack.push([cx, cy - 1]);
      if (cy < height - 1) stack.push([cx, cy + 1]);
    }

    drawCtx.putImageData(imageData, 0, 0);
    return { type: "fill", x: startX, y: startY, color: fillColor };
  }

  function redrawActions() {
    drawCtx.setTransform(1, 0, 0, 1, 0, 0);
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    for (const action of actionHistory) {
      if (action.type === "stroke") drawStroke(action);
      else if (action.type === "fill") floodFill(action.x, action.y, action.color);
    }
  }

  function getPointerPosition(event) {
    const rect = drawCanvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
      x: (clientX - rect.left) * dpr,
      y: (clientY - rect.top) * dpr,
    };
  }

  function startDrawing(event) {
    event.preventDefault();

    if (isImageEditActive()) {
      isDraggingImage = true;
      canvasWrapper.classList.add("canvas-wrapper--dragging");
      const point = getPointerPosition(event);
      imageDragStart = {
        x: point.x,
        y: point.y,
        offsetXRatio: imageTransform.offsetXRatio,
        offsetYRatio: imageTransform.offsetYRatio,
      };
      return;
    }

    const point = getPointerPosition(event);

    if (currentTool === "fill") {
      const fillAction = floodFill(point.x, point.y, currentColor);
      if (fillAction) actionHistory.push(fillAction);
      return;
    }

    isDrawing = true;
    lastPoint = point;
    actionHistory.push({
      type: "stroke",
      color: currentColor,
      points: [{ ...point, width: Number(strokeWidthInput.value) * dpr }],
    });
  }

  function draw(event) {
    if (isDraggingImage && isImageEditActive()) {
      event.preventDefault();
      const point = getPointerPosition(event);
      imageTransform.offsetXRatio = Math.max(
        -1,
        Math.min(1, imageDragStart.offsetXRatio + (point.x - imageDragStart.x) / (guideCanvas.width / 2))
      );
      imageTransform.offsetYRatio = Math.max(
        -1,
        Math.min(1, imageDragStart.offsetYRatio + (point.y - imageDragStart.y) / (guideCanvas.height / 2))
      );
      syncTransformToHiddenInputs();
      drawGuide();
      return;
    }

    if (!isDrawing || currentTool !== "pen") return;
    event.preventDefault();

    const point = getPointerPosition(event);
    const stroke = actionHistory[actionHistory.length - 1];
    stroke.points.push({ ...point, width: stroke.points[0].width });

    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawCtx.strokeStyle = stroke.color;
    drawCtx.lineWidth = stroke.points[0].width;
    drawCtx.beginPath();
    drawCtx.moveTo(lastPoint.x, lastPoint.y);
    drawCtx.lineTo(point.x, point.y);
    drawCtx.stroke();
    lastPoint = point;
  }

  function stopDrawing() {
    isDrawing = false;
    lastPoint = null;
    if (isDraggingImage) {
      isDraggingImage = false;
      canvasWrapper.classList.remove("canvas-wrapper--dragging");
      imageDragStart = null;
    }
  }

  function loadImage(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        guideImage = img;
        resetImageTransform();
        setGuideLayer("front");
        setTool("fill");
        drawGuide();
        updateImageEditUI();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    guideImage = null;
    imageInput.value = "";
    resetImageTransform();
    canvasWrapper.classList.remove("canvas-wrapper--dragging", "canvas-wrapper--image-edit");
    drawGuide();
    updateImageEditUI();
  }

  function bindEvents() {
    toolButtons.forEach((btn) => {
      btn.addEventListener("click", () => setTool(btn.dataset.tool));
    });

    layerButtons.forEach((btn) => {
      btn.addEventListener("click", () => setGuideLayer(btn.dataset.layer));
    });

    btnClear.addEventListener("click", () => {
      actionHistory.length = 0;
      drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    });

    btnUndo.addEventListener("click", () => {
      actionHistory.pop();
      redrawActions();
    });

    btnConfirmImage.addEventListener("click", confirmImage);
    btnReeditImage.addEventListener("click", reeditImage);
    btnRemoveImage.addEventListener("click", removeImage);
    btnImageBigger.addEventListener("click", () => changeImageScale(0.15));
    btnImageSmaller.addEventListener("click", () => changeImageScale(-0.15));

    imageInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) loadImage(file);
    });

    practiceText.addEventListener("input", () => {
      if (!isImageMode()) scheduleTextGuideUpdate();
    });

    drawCanvas.addEventListener("mousedown", startDrawing);
    drawCanvas.addEventListener("mousemove", draw);
    drawCanvas.addEventListener("mouseup", stopDrawing);
    drawCanvas.addEventListener("mouseleave", stopDrawing);
    drawCanvas.addEventListener("touchstart", startDrawing, { passive: false });
    drawCanvas.addEventListener("touchmove", draw, { passive: false });
    drawCanvas.addEventListener("touchend", stopDrawing);
    drawCanvas.addEventListener("touchcancel", stopDrawing);

    window.addEventListener("resize", resizeCanvases);
  }

  function init() {
    buildPalette();
    setGuideLayer("back");
    bindEvents();
    resizeCanvases();
    updateImageEditUI();
  }

  init();
})();
