(function () {
  const practiceText = document.getElementById("practice-text");
  const fontSizeInput = document.getElementById("font-size");
  const lineHeightInput = document.getElementById("line-height");
  const strokeWidthInput = document.getElementById("stroke-width");
  const guideOpacityInput = document.getElementById("guide-opacity");
  const fontSizeValue = document.getElementById("font-size-value");
  const lineHeightValue = document.getElementById("line-height-value");
  const strokeWidthValue = document.getElementById("stroke-width-value");
  const guideOpacityValue = document.getElementById("guide-opacity-value");
  const btnClear = document.getElementById("btn-clear");
  const btnUndo = document.getElementById("btn-undo");
  const btnUpdate = document.getElementById("btn-update");
  const canvasWrapper = document.getElementById("canvas-wrapper");
  const guideCanvas = document.getElementById("guide-canvas");
  const drawCanvas = document.getElementById("draw-canvas");

  const guideCtx = guideCanvas.getContext("2d");
  const drawCtx = drawCanvas.getContext("2d");

  let dpr = 1;
  let isDrawing = false;
  let lastPoint = null;
  const strokeHistory = [];

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

    drawGuideText();
    redrawStrokes();
  }

  function drawGuideText() {
    const { text, fontSize, lineHeight, guideOpacity } = getSettings();
    guideCtx.setTransform(1, 0, 0, 1, 0, 0);
    guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);

    if (!text.trim()) return;

    const scaledFontSize = fontSize * dpr;
    const padding = 24 * dpr;
    const maxWidth = guideCanvas.width - padding * 2;
    const lineGap = scaledFontSize * lineHeight;

    guideCtx.font = `${scaledFontSize}px "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif`;
    guideCtx.fillStyle = `rgba(120, 116, 108, ${guideOpacity})`;
    guideCtx.textBaseline = "top";

    const lines = text.split("\n");
    let y = padding;

    for (const line of lines) {
      if (y + scaledFontSize > guideCanvas.height - padding) break;

      if (line.trim() === "") {
        y += lineGap;
        continue;
      }

      guideCtx.fillText(line, padding, y, maxWidth);
      y += lineGap;
    }
  }

  function redrawStrokes() {
    drawCtx.setTransform(1, 0, 0, 1, 0, 0);
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawCtx.strokeStyle = "#2c2a26";

    for (const stroke of strokeHistory) {
      if (stroke.length < 2) continue;
      drawCtx.beginPath();
      drawCtx.lineWidth = stroke[0].width;
      drawCtx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        drawCtx.lineTo(stroke[i].x, stroke[i].y);
      }
      drawCtx.stroke();
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
    isDrawing = true;
    lastPoint = getPointerPosition(event);
    const width = Number(strokeWidthInput.value) * dpr;
    strokeHistory.push([{ ...lastPoint, width }]);
  }

  function draw(event) {
    if (!isDrawing) return;
    event.preventDefault();

    const point = getPointerPosition(event);
    const currentStroke = strokeHistory[strokeHistory.length - 1];
    currentStroke.push({ ...point, width: currentStroke[0].width });

    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawCtx.strokeStyle = "#2c2a26";
    drawCtx.lineWidth = currentStroke[0].width;
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
    strokeHistory.length = 0;
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  }

  function undoStroke() {
    if (strokeHistory.length === 0) return;
    strokeHistory.pop();
    redrawStrokes();
  }

  function bindEvents() {
    [fontSizeInput, lineHeightInput, guideOpacityInput].forEach((input) => {
      input.addEventListener("input", () => {
        updateLabels();
        drawGuideText();
      });
    });

    strokeWidthInput.addEventListener("input", updateLabels);

    btnUpdate.addEventListener("click", () => {
      drawGuideText();
    });

    btnClear.addEventListener("click", clearDrawing);
    btnUndo.addEventListener("click", undoStroke);

    practiceText.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        drawGuideText();
      }
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
    updateLabels();
    bindEvents();
    resizeCanvases();
  }

  init();
})();
