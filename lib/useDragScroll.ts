"use client";

import { useCallback } from "react";

// Faixas que rolam de lado (chips, fotos) escondem a barra de rolagem. No
// celular o dedo resolve; no PC a roda do mouse rola na vertical e arrastar
// seleciona texto. Aqui a roda vira rolagem lateral e o mouse arrasta a faixa
// (sem disparar o clique do chip onde o arrasto terminou). É uma ref de
// callback: liga quando a faixa aparece e desliga quando ela sai da tela.
export function useDragScroll() {
  return useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const el = node;

    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      // No fim da faixa, a roda volta a rolar a página
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max - 1)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    }

    let start: { x: number; left: number; id: number } | null = null;
    let dragged = false;
    let snap = "";

    function onDown(e: PointerEvent) {
      if (e.pointerType !== "mouse" || e.button !== 0 || el.scrollWidth <= el.clientWidth) return;
      start = { x: e.clientX, left: el.scrollLeft, id: e.pointerId };
      dragged = false;
    }
    function onMove(e: PointerEvent) {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      if (!dragged && Math.abs(dx) < 5) return;
      if (!dragged) {
        dragged = true;
        el.setPointerCapture(e.pointerId);
        // O encaixe (snap) puxaria a faixa de volta a cada passo
        snap = el.style.scrollSnapType;
        el.style.scrollSnapType = "none";
        el.style.cursor = "grabbing";
        window.getSelection()?.removeAllRanges();
      }
      el.scrollLeft = start.left - dx;
    }
    function onUp() {
      if (!start) return;
      start = null;
      if (dragged) {
        el.style.scrollSnapType = snap;
        el.style.cursor = "";
      }
    }
    function onClick(e: MouseEvent) {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
    }
    // Sem isso o navegador começa a arrastar a imagem ou o link
    const onDragStart = (e: DragEvent) => e.preventDefault();

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClick, true);
    el.addEventListener("dragstart", onDragStart);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("dragstart", onDragStart);
    };
  }, []);
}
