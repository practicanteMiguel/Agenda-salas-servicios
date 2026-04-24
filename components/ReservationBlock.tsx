"use client";

import { useState } from "react";
import clsx from "clsx";
import { Reserva } from "@/types";

const BLOCK_COLORS: Record<string, string> = {
  "Sala 1": "bg-blue-500 border-blue-700 hover:bg-blue-600",
  "Sala 2": "bg-violet-500 border-violet-700 hover:bg-violet-600",
  "Sala 3": "bg-emerald-500 border-emerald-700 hover:bg-emerald-600",
};

interface Props {
  reserva: Reserva;
  top: number;
  height: number;
  onLiberar: (id: string) => void;
  onReactivar: (id: string) => void;
  onEliminar: (id: string) => void;
}

export function ReservationBlock({
  reserva,
  top,
  height,
  onLiberar,
  onReactivar,
  onEliminar,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isReservado = reserva.estado === "reservado";
  const color = BLOCK_COLORS[reserva.sala] ?? "bg-gray-500 border-gray-700 hover:bg-gray-600";
  const compact = height < 52;

  const handleDragStart = (e: React.DragEvent) => {
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
    // Delay so the drag ghost captures the full-opacity block, then fade original
    setTimeout(() => setIsDragging(true), 0);
  };

  const handleDragEnd = () => setIsDragging(false);

  return (
    <div
      draggable={isReservado}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={clsx(
        "absolute left-1 right-1 rounded-lg border-l-4 shadow-md z-10 overflow-hidden transition-opacity",
        isReservado
          ? clsx(color, "text-white cursor-grab active:cursor-grabbing")
          : "bg-gray-200 border-gray-400 text-gray-600 cursor-pointer",
        isDragging ? "opacity-40" : "opacity-100"
      )}
      style={{ top: top + 1, height: Math.max(height - 2, 24) }}
      onClick={(e) => {
        e.stopPropagation();
        setShowMenu((v) => !v);
      }}
    >
      {!showMenu ? (
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
                <p className={clsx("text-xs truncate", isReservado ? "text-white/80" : "opacity-50")}>
                  {reserva.area}
                </p>
              </div>
              <p className={clsx("text-xs", isReservado ? "text-white/70" : "opacity-40")}>
                {reserva.horaInicio} – {reserva.horaFin}
                {!isReservado && " · liberada"}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center gap-1.5 p-2">
          {isReservado ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLiberar(reserva.id);
                setShowMenu(false);
              }}
              className="w-full bg-amber-400 hover:bg-amber-500 text-black text-xs font-bold py-1.5 rounded-lg transition-colors"
            >
              Liberar sala
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReactivar(reserva.id);
                setShowMenu(false);
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
            >
              Reactivar
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEliminar(reserva.id);
              setShowMenu(false);
            }}
            className="w-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
          >
            Eliminar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
            }}
            className="text-white/50 text-xs hover:text-white transition-colors mt-0.5"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
