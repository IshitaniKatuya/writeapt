(function () {
  const PRESET_COLORS = [
    "#2c2a26", "#e53935", "#fb8c00", "#fdd835",
    "#43a047", "#1e88e5", "#8e24aa", "#ffffff",
  ];

  const practiceText = document.getElementById("practice-text");
  const fontSizeInput = document.getElementById("font-size");
  const lineHeightInput = document.getElementById("line-height");
  const strokeWidthInput = document.getElementById("stroke-width");
  const guideOpacityInput = document.getElementById("guide-opacity");
  const guideVisibleInput = document.getElementById("guide-visible");
  const fontSizeValue = document.getElementById("font-size-value");
  const lineHeightValue = document.getElementById("line-height-value");
  const strokeWidthValue = document.getElementById("stroke-width-value");
  const guideOpacityValue = document.getElementById("guide-opacity-value");
  const btnClear = document.getElementById("btn-clear");
  const btnUndo = document.getElementById("btn-undo");
  const btnRemoveImage = document.getElementById("btn-remove-image");
  const imageInput = document.getElementById("image-input");
  const canvasWrapper = document.getElementById("canvas-wrapper");
  const guideCanvas = document.getElementById("guide-canvas");
  const drawCanvas = document.getElementById("draw-canvas");
  const colorPalette = document.getElementById("color-palette");
  const customColorInput = document.getElementById("custom-color");
  const customColorSwatch = document.getElementById("custom-color-swatch");
  const textGuidePanel = document.getElementById("text-guide-panel");
  const imageGuidePanel = document.getElementById("image-guide-panel");
  const canvasHint = document.getElementById("canvas-hint");
  const toolBadge = document.getElementById("tool-badge");
  const guideBadge = document.getElementById("guide-badge");
  const toolButtons = document.querySelectorAll("[data-tool]");
  const guideButtons = document.querySelectorAll("[data-guide]");
  const layerButtons = document.querySelectorAll("[data-layer]");

  const guideCtx = guideCanvas.getContext("2d");
  const drawCtx = drawCanvas.getContext("2d");

  let dpr = 1;
  let isDrawing = false;
  let lastPoint = null;
  const actionHistory = [];
  let currentTool = "pen";
  let currentGuide = "text";
  let currentColor = PRESET_COLORS[0];
  let guideImage = null;
  let guideLayer = "back";
  let guideVisible = true;
  let textUpdateTimer = null;

  function getSettings() {
    return {
      text: practiceText.value,
      fontSize: Number(fontSizeInput.value),
      lineHeight: Number(lineHeightInput.value),
      strokeWidth: Number(strokeWidthInput.value),
      guideOpacity: Number(guideOpacityInput.value),
    };
  }

  function updateLabels() {
    fontSizeValue.textContent = `${fontSizeInput.value}px`;
    lineHeightValue.textContent = lineHeightInput.value;
    strokeWidthValue.textContent = `${strokeWidthInput.value}px`;
    guideOpacityValue.textContent = `${Math.round(Number(guideOpacityInput.value) * 100)}%`;
  }

  function updateBadges() {
    toolBadge.textContent = currentTool === "fill" ? "塗り" : "ペン";

    if (!guideVisible) {
      guideBadge.textContent = "手本：非表示";
      return;
    }

    const mode = currentGuide === "image" ? "画像" : "テキスト";
    const layer = guideLayer === "front" ? "前面" : "背面";
    guideBadge.textContent = `手本：${mode}・${layer}`;
  }

  function setTool(tool) {
    currentTool = tool;
    toolButtons.forEach((btn) => {
      const active = btn.dataset.tool === tool;
      btn.classList.toggle("seg-control__btn--active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    drawCanvas.classList.toggle("cursor-fill", tool === "fill");
    canvasHint.textContent =
      tool === "fill"
        ? "塗りたい場所をタップ／クリック"
        : "マウス・指でなぞってください";
    updateBadges();
  }

  function setGuideLayer(layer) {
    guideLayer = layer;
    layerButtons.forEach((btn) => {
      const active = btn.dataset.layer === layer;
      btn.classList.toggle("seg-control__btn--active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    canvasWrapper.classList.toggle("canvas-wrapper--guide-front", layer === "front");
    canvasWrapper.classList.toggle("canvas-wrapper--guide-back", layer === "back");
    updateBadges();
  }

  function setGuideVisible(visible) {
    guideVisible = visible;
    guideVisibleInput.checked = visible;
    canvasWrapper.classList.toggle("canvas-wrapper--guide-hidden", !visible);
    document.getElementById("guide-layer-row").classList.toggle("hidden", !visible);
    drawGuide();
    updateBadges();
  }

  function setGuideMode(mode) {
    if (mode === "image" && !guideImage) {
      imageGuidePanel.classList.remove("hidden");
      textGuidePanel.classList.add("hidden");
      currentGuide = "image";
      guideButtons.forEach((btn) => {
        const active = btn.dataset.guide === "image";
        btn.classList.toggle("seg-control__btn--active", active);
        btn.setAttribute("aria-pressed", String(active));
      });
      document.querySelectorAll(".control--text-only").forEach((el) => {
        el.classList.add("hidden");
      });
      drawGuide();
      updateBadges();
      return;
    }

    currentGuide = mode;
    guideButtons.forEach((btn) => {
      const active = btn.dataset.guide === mode;
      btn.classList.toggle("seg-control__btn--active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    textGuidePanel.classList.toggle("hidden", mode !== "text");
    imageGuidePanel.classList.toggle("hidden", mode !== "image");
    document.querySelectorAll(".control--text-only").forEach((el) => {
      el.classList.toggle("hidden", mode !== "text");
    });
    drawGuide();
    updateBadges();
  }

  function setColor(color) {
    currentColor = color;
    colorPalette.querySelectorAll(".palette__color").forEach((btn) => {
      btn.classList.toggle("palette__color--active", btn.dataset.color === color);
    });
    customColorSwatch.style.background = color;
    if (!PRESET_COLORS.includes(color)) {
      customColorInput.value = color;
    }
  }

  function buildPalette() {
    PRESET_COLORS.forEach((color, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette__color";
      btn.dataset.color = color;
      btn.style.background = color;
      btn.setAttribute("aria-label", `色 ${index + 1}`);
      if (color === "#ffffff") btn.classList.add("palette__color--light");
      btn.addEventListener("click", () => setColor(color));
      colorPalette.appendChild(btn);
    });
    setColor(PRESET_COLORS[0]);
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

    if (!guideVisible) return;

    const { text, fontSize, lineHeight, guideOpacity } = getSettings();
    if (!text.trim()) return;

    const scaledFontSize = fontSize * dpr;
    const padding = 24 * dpr;
    const lineGap = scaledFontSize * lineHeight;
    const centerX = guideCanvas.width / 2;

    guideCtx.font = `${scaledFontSize}px "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif`;
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

  function toGrayscaleImageData(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    return imageData;
  }

  function drawGuideImage() {
    guideCtx.setTransform(1, 0, 0, 1, 0, 0);
    guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);

    if (!guideVisible || !guideImage) return;

    const { guideOpacity } = getSettings();
    const padding = 16 * dpr;
    const maxW = guideCanvas.width - padding * 2;
    const maxH = guideCanvas.height - padding * 2;
    const scale = Math.min(maxW / guideImage.width, maxH / guideImage.height);
    const drawW = Math.max(1, Math.floor(guideImage.width * scale));
    const drawH = Math.max(1, Math.floor(guideImage.height * scale));
    const x = (guideCanvas.width - drawW) / 2;
    const y = (guideCanvas.height - drawH) / 2;

    const temp = document.createElement("canvas");
    temp.width = drawW;
    temp.height = drawH;
    const tempCtx = temp.getContext("2d");
    tempCtx.drawImage(guideImage, 0, 0, drawW, drawH);

    try {
      const imageData = toGrayscaleImageData(tempCtx.getImageData(0, 0, drawW, drawH));
      tempCtx.putImageData(imageData, 0, 0);
    } catch {
      // CORS等でgetImageDataが失敗した場合はそのまま描画
    }

    guideCtx.globalAlpha = guideOpacity;
    guideCtx.drawImage(temp, x, y);
    guideCtx.globalAlpha = 1;
  }

  function drawGuide() {
    if (currentGuide === "image") {
      drawGuideImage();
    } else {
      drawGuideText();
    }
  }

  function scheduleTextGuideUpdate() {
    clearTimeout(textUpdateTimer);
    textUpdateTimer = setTimeout(() => {
      if (currentGuide === "text") drawGuide();
    }, 120);
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
    const full = value.length === 3
      ? value.split("").map((c) => c + c).join("")
      : value;
    const num = parseInt(full, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 255,
    };
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
    fill.a = 255;

    if (colorsMatch(target, fill, 0)) return null;

    const tolerance = 32;
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

      if (!colorsMatch(current, target, tolerance)) continue;

      data[index] = fill.r;
      data[index + 1] = fill.g;
      data[index + 2] = fill.b;
      data[index + 3] = fill.a;

      if (cx > 0) stack.push([cx - 1, cy]);
      if (cx < width - 1) stack.push([cx + 1, cy]);
      if (cy > 0) stack.push([cx, cy - 1]);
      if (cy < height - 1) stack.push([cx, cy + 1]);
    }

    drawCtx.putImageData(imageData, 0, 0);
    return { type: "fill", x: startX, y: startY, color: fillColor };
  }

  function applyFillAction(action) {
    floodFill(action.x, action.y, action.color);
  }

  function redrawActions() {
    drawCtx.setTransform(1, 0, 0, 1, 0, 0);
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    for (const action of actionHistory) {
      if (action.type === "stroke") {
        drawStroke(action);
      } else if (action.type === "fill") {
        applyFillAction(action);
      }
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
    const point = getPointerPosition(event);

    if (currentTool === "fill") {
      const fillAction = floodFill(point.x, point.y, currentColor);
      if (fillAction) actionHistory.push(fillAction);
      return;
    }

    isDrawing = true;
    lastPoint = point;
    const width = Number(strokeWidthInput.value) * dpr;
    actionHistory.push({
      type: "stroke",
      color: currentColor,
      points: [{ ...lastPoint, width }],
    });
  }

  function draw(event) {
    if (!isDrawing || currentTool !== "pen") return;
    event.preventDefault();

    const point = getPointerPosition(event);
    const currentStroke = actionHistory[actionHistory.length - 1];
    currentStroke.points.push({ ...point, width: currentStroke.points[0].width });

    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawCtx.strokeStyle = currentStroke.color;
    drawCtx.lineWidth = currentStroke.points[0].width;
    drawCtx.beginPath();
    drawCtx.moveTo(lastPoint.x, lastPoint.y);
    drawCtx.lineTo(point.x, point.y);
    drawCtx.stroke();

    lastPoint = point;
  }

  function stopDrawing() {
    isDrawing = false;
    lastPoint = null;
  }

  function clearDrawing() {
    actionHistory.length = 0;
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  }

  function undoAction() {
    if (actionHistory.length === 0) return;
    actionHistory.pop();
    redrawActions();
  }

  function loadImage(file) {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        guideImage = img;
        btnRemoveImage.classList.remove("hidden");
        setGuideMode("image");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    guideImage = null;
    imageInput.value = "";
    btnRemoveImage.classList.add("hidden");
    if (currentGuide === "image") setGuideMode("text");
    else drawGuide();
  }

  function bindEvents() {
    toolButtons.forEach((btn) => {
      btn.addEventListener("click", () => setTool(btn.dataset.tool));
    });

    guideButtons.forEach((btn) => {
      btn.addEventListener("click", () => setGuideMode(btn.dataset.guide));
    });

    layerButtons.forEach((btn) => {
      btn.addEventListener("click", () => setGuideLayer(btn.dataset.layer));
    });

    guideVisibleInput.addEventListener("change", (event) => {
      setGuideVisible(event.target.checked);
    });

    customColorInput.addEventListener("input", (event) => {
      setColor(event.target.value);
    });

    document.querySelector(".color-custom").addEventListener("click", () => {
      customColorInput.click();
    });

    practiceText.addEventListener("input", () => {
      updateLabels();
      scheduleTextGuideUpdate();
    });

    [fontSizeInput, lineHeightInput, guideOpacityInput].forEach((input) => {
      input.addEventListener("input", () => {
        updateLabels();
        drawGuide();
      });
    });

    strokeWidthInput.addEventListener("input", updateLabels);

    btnClear.addEventListener("click", clearDrawing);
    btnUndo.addEventListener("click", undoAction);
    btnRemoveImage.addEventListener("click", removeImage);

    imageInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) loadImage(file);
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
    updateLabels();
    setGuideLayer("back");
    setGuideVisible(true);
    bindEvents();
    resizeCanvases();
    updateBadges();
  }

  init();
})();
