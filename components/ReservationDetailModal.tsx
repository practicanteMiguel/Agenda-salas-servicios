"use client";

import { useState } from "react";
import clsx from "clsx";
import { Reserva } from "@/types";
import { ADMIN_PIN } from "@/lib/adminPin";

interface Props {
  reserva: Reserva | null;
  onClose: () => void;
  onLiberar: (id: string) => void;
  onReactivar: (id: string) => void;
  onEliminar: (id: string) => void;
}

type PendingAction = "liberar" | "eliminar" | null;

export function ReservationDetailModal({
  reserva,
  onClose,
  onLiberar,
  onReactivar,
  onEliminar,
}: Props) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  if (!reserva) return null;

  const isReservado = reserva.estado === "reservado";

  const handleConfirm = () => {
    if (pin !== ADMIN_PIN) {
      setPinError(true);
      setPin("");
      return;
    }
    if (pending === "liberar") onLiberar(reserva.id);
    if (pending === "eliminar") onEliminar(reserva.id);
    onClose();
  };

  const handleReactivar = () => {
    onReactivar(reserva.id);
    onClose();
  };

  const cancelPin = () => {
    setPending(null);
    setPin("");
    setPinError(false);
  };

  const SALA_COLORS: Record<string, string> = {
    "Sala 1": "bg-blue-600",
    "Sala 2": "bg-violet-600",
    "Sala 3": "bg-emerald-600",
  };
  const salaColor = SALA_COLORS[reserva.sala] ?? "bg-gray-600";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={clsx(
                    "text-xs font-bold text-white px-2 py-0.5 rounded-full",
                    salaColor
                  )}
                >
                  {reserva.sala}
                </span>
                <span
                  className={clsx(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    isReservado
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {isReservado ? "Reservada" : "Liberada"}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {reserva.solicitante}
              </h2>
              <p className="text-sm text-gray-500 truncate">{reserva.area}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-sm text-gray-600">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{reserva.fecha}</span>
            <span className="text-gray-300">·</span>
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              {reserva.horaInicio} - {reserva.horaFin}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {pending ? (
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">
                {pending === "liberar"
                  ? "Confirmar liberacion de sala"
                  : "Confirmar eliminacion de reserva"}
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Ingresa el codigo de administrador para continuar.
              </p>
              <input
                type="password"
                inputMode="numeric"
                placeholder="Codigo"
                value={pin}
                autoFocus
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                className={clsx(
                  "w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                  pinError
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-200 focus:ring-blue-500"
                )}
              />
              {pinError && (
                <p className="text-xs text-red-500 mt-1">Codigo incorrecto</p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={cancelPin}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  className={clsx(
                    "flex-1 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors",
                    pending === "eliminar"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-amber-500 hover:bg-amber-600 text-black"
                  )}
                >
                  Confirmar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {isReservado ? (
                <button
                  onClick={() => setPending("liberar")}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-black font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  Liberar sala
                </button>
              ) : (
                <button
                  onClick={handleReactivar}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  Reactivar reserva
                </button>
              )}
              <button
                onClick={() => setPending("eliminar")}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                Eliminar reserva
              </button>
            </div>
          )}
        </div>

        {/* Safe area spacing for mobile */}
        <div className="h-safe-bottom sm:h-0 pb-4 sm:pb-0" />
      </div>
    </div>
  );
}
