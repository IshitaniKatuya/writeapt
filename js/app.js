(function () {
  "use strict";

  const practiceText = document.getElementById("practice-text");
  const fontSizeInput = document.getElementById("font-size");
  const penSizeInput = document.getElementById("pen-size");
  const templateOpacityInput = document.getElementById("template-opacity");
  const fontSizeValue = document.getElementById("font-size-value");
  const penSizeValue = document.getElementById("pen-size-value");
  const templateOpacityValue = document.getElementById("template-opacity-value");
  const btnApply = document.getElementById("btn-apply");
  const btnUndo = document.getElementById("btn-undo");
  const btnClear = document.getElementById("btn-clear");
  const wrapper = document.getElementById("practice-wrapper");
  const templateCanvas = document.getElementById("template-canvas");
  const drawCanvas = document.getElementById("draw-canvas");

  const templateCtx = templateCanvas.getContext("2d");
  const drawCtx = drawCanvas.getContext("2d");

  let isDrawing = false;
  let currentStroke = [];
  const strokes = [];
  let dpr = window.devicePixelRatio || 1;

  function getFontSize() {
    return Number(fontSizeInput.value);
  }

  function getPenSize() {
    return Number(penSizeInput.value);
  }

  function getTemplateOpacity() {
    return Number(templateOpacityInput.value) / 100;
  }

  function updateLabels() {
    fontSizeValue.textContent = fontSizeInput.value;
    penSizeValue.textContent = penSizeInput.value;
    templateOpacityValue.textContent = templateOpacityInput.value;
  }

  function resizeCanvases() {
    const rect = wrapper.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);

    dpr = window.devicePixelRatio || 1;

    [templateCanvas, drawCanvas].forEach((canvas) => {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
    });

    templateCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawTemplate();
    redrawStrokes();
  }

  function measureTextHeight(lines, fontSize, lineHeight) {
    return lines.length * fontSize * lineHeight;
  }

  function drawTemplate() {
    const width = templateCanvas.width / dpr;
    const height = templateCanvas.height / dpr;

    templateCtx.clearRect(0, 0, width, height);

    const text = practiceText.value;
    if (!text.trim()) return;

    const fontSize = getFontSize();
    const lineHeight = 1.5;
    const opacity = getTemplateOpacity();
    const lines = text.split("\n");

    templateCtx.font = `${fontSize}px "Noto Sans JP", "Hiragino Sans", sans-serif`;
    templateCtx.fillStyle = `rgba(120, 120, 120, ${opacity})`;
    templateCtx.textBaseline = "top";

    const totalHeight = measureTextHeight(lines, fontSize, lineHeight);
    let y = Math.max((height - totalHeight) / 2, fontSize * 0.3);

    lines.forEach((line) => {
      templateCtx.fillText(line, width * 0.06, y);
      y += fontSize * lineHeight;
    });
  }

  function redrawStrokes() {
    const width = drawCanvas.width / dpr;
    const height = drawCanvas.height / dpr;
    drawCtx.clearRect(0, 0, width, height);

    strokes.forEach((stroke) => {
      drawStroke(stroke);
    });
  }

  function drawStroke(stroke) {
    if (stroke.points.length < 2) return;

    drawCtx.strokeStyle = "#1a1a1a";
    drawCtx.lineWidth = stroke.size;
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";

    drawCtx.beginPath();
    drawCtx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i++) {
      const prev = stroke.points[i - 1];
      const curr = stroke.points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      drawCtx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }

    const last = stroke.points[stroke.points.length - 1];
    drawCtx.lineTo(last.x, last.y);
    drawCtx.stroke();
  }

  function getPointerPosition(event) {
    const rect = drawCanvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event) {
    event.preventDefault();
    isDrawing = true;
    currentStroke = {
      size: getPenSize(),
      points: [getPointerPosition(event)],
    };
  }

  function continueDrawing(event) {
    if (!isDrawing) return;
    event.preventDefault();
    currentStroke.points.push(getPointerPosition(event));
    redrawStrokes();
    drawStroke(currentStroke);
  }

  function endDrawing(event) {
    if (!isDrawing) return;
    if (event) event.preventDefault();
    isDrawing = false;

    if (currentStroke.points.length > 1) {
      strokes.push(currentStroke);
    }
    currentStroke = [];
  }

  function adjustWrapperHeight() {
    const text = practiceText.value;
    const lines = text.split("\n").length || 1;
    const fontSize = getFontSize();
    const lineHeight = 1.5;
    const padding = 80;
    const contentHeight = lines * fontSize * lineHeight + padding;
    const minHeight = window.innerWidth <= 600 ? 260 : 320;
    wrapper.style.height = Math.max(contentHeight, minHeight) + "px";
    resizeCanvases();
  }

  function applyText() {
    adjustWrapperHeight();
  }

  function undoStroke() {
    strokes.pop();
    redrawStrokes();
  }

  function clearStrokes() {
    strokes.length = 0;
    redrawStrokes();
  }

  drawCanvas.addEventListener("pointerdown", startDrawing);
  drawCanvas.addEventListener("pointermove", continueDrawing);
  drawCanvas.addEventListener("pointerup", endDrawing);
  drawCanvas.addEventListener("pointerleave", endDrawing);
  drawCanvas.addEventListener("pointercancel", endDrawing);

  fontSizeInput.addEventListener("input", () => {
    updateLabels();
    adjustWrapperHeight();
  });

  penSizeInput.addEventListener("input", updateLabels);

  templateOpacityInput.addEventListener("input", () => {
    updateLabels();
    drawTemplate();
  });

  btnApply.addEventListener("click", applyText);
  btnUndo.addEventListener("click", undoStroke);
  btnClear.addEventListener("click", clearStrokes);

  practiceText.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      applyText();
    }
  });

  window.addEventListener("resize", adjustWrapperHeight);

  updateLabels();
  adjustWrapperHeight();
})();
