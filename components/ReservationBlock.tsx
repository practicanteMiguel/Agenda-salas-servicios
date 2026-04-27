"use client";

import { useState } from "react";
import clsx from "clsx";
import { Reserva } from "@/types";

const BLOCK_COLORS: Record<string, string> = {
  "Sala Recepcion": "bg-blue-500 border-blue-700 hover:bg-blue-600",
  "Sala Juntas": "bg-violet-500 border-violet-700 hover:bg-violet-600",
  "Sala Operaciones": "bg-emerald-500 border-emerald-700 hover:bg-emerald-600",
};

interface Props {
  reserva: Reserva;
  top: number;
  height: number;
  canDrag: boolean;
  canResize: boolean;
  onDetails: (reserva: Reserva) => void;
  onDragStarted: (offsetY: number, durationMinutes: number) => void;
  onDragEnded: () => void;
  onResizeStarted: (reservaId: string, originalEndMins: number, startClientY: number) => void;
}

export function ReservationBlock({
  reserva,
  top,
  height,
  canDrag,
  canResize,
  onDetails,
  onDragStarted,
  onDragEnded,
  onResizeStarted,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const isReservado = reserva.estado === "reservado";
  const color = BLOCK_COLORS[reserva.sala] ?? "bg-gray-500 border-gray-700 hover:bg-gray-600";
  const compact = height < 52;

  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const [sh, sm] = reserva.horaInicio.split(":").map(Number);
    const [eh, em] = reserva.horaFin.split(":").map(Number);
    const durationMinutes = eh * 60 + em - (sh * 60 + sm);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ reservaId: reserva.id, offsetY, durationMinutes })
    );
    e.dataTransfer.effectAllowed = "move";
    onDragStarted(offsetY, durationMinutes);
    setTimeout(() => setIsDragging(true), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnded();
  };

  const startResize = (clientY: number) => {
    const [eh, em] = reserva.horaFin.split(":").map(Number);
    onResizeStarted(reserva.id, eh * 60 + em, clientY);
  };

  return (
    <div
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={clsx(
        "absolute left-1 right-1 rounded-lg border-l-4 shadow-md z-10 overflow-hidden transition-opacity",
        isReservado
          ? clsx(color, canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer")
          : "bg-gray-200 border-gray-400 text-gray-600 cursor-pointer",
        isDragging ? "opacity-40" : "opacity-100"
      )}
      style={{ top: top + 1, height: Math.max(height - 2, 24) }}
      onClick={(e) => {
        e.stopPropagation();
        onDetails(reserva);
      }}
    >
      <div className="px-2 py-1.5 h-full flex flex-col justify-between overflow-hidden">
        {compact ? (
          <span
            className={clsx(
              "text-xs font-semibold truncate leading-tight",
              !isReservado && "line-through opacity-60"
            )}
          >
            {reserva.solicitante} · {reserva.horaInicio}–{reserva.horaFin}
          </span>
        ) : (
          <>
            <div>
              <p
                className={clsx(
                  "text-xs font-bold truncate leading-tight",
                  !isReservado && "line-through opacity-60"
                )}
              >
                {reserva.solicitante}
              </p>
              <p
                className={clsx(
                  "text-xs truncate",
                  isReservado ? "text-white/80" : "opacity-50"
                )}
              >
                {reserva.area}
              </p>
            </div>
            <p
              className={clsx(
                "text-xs",
                isReservado ? "text-white/70" : "opacity-40"
              )}
            >
              {reserva.horaInicio} – {reserva.horaFin}
              {!isReservado && " · liberada"}
            </p>
          </>
        )}
      </div>

      {/* Resize handle — for future and currently-active reservations */}
      {canResize && (
        <div
          draggable={false}
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            startResize(e.clientY);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            startResize(e.touches[0].clientY);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-6 h-0.5 rounded-full bg-white/60" />
        </div>
      )}
    </div>
  );
}
