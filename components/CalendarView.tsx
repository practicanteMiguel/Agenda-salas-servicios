"use client";

import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import clsx from "clsx";
import { Reserva } from "@/types";
import { ReservationBlock } from "./ReservationBlock";
import { ReservationDetailModal } from "./ReservationDetailModal";

const SALAS = ["Sala Recepcion", "Sala Juntas", "Sala Operaciones"] as const;

const SALA_STYLES = {
  "Sala Recepcion": {
    header: "bg-blue-600 text-white",
    body: "bg-blue-50/30",
    border: "border-blue-100",
    dragOver: "border-blue-400 bg-blue-50/70 border-2 border-dashed",
    preview: "border-blue-500 bg-blue-50/80",
    previewText: "text-blue-700",
  },
  "Sala Juntas": {
    header: "bg-violet-600 text-white",
    body: "bg-violet-50/30",
    border: "border-violet-100",
    dragOver: "border-violet-400 bg-violet-50/70 border-2 border-dashed",
    preview: "border-violet-500 bg-violet-50/80",
    previewText: "text-violet-700",
  },
  "Sala Operaciones": {
    header: "bg-emerald-600 text-white",
    body: "bg-emerald-50/30",
    border: "border-emerald-100",
    dragOver: "border-emerald-400 bg-emerald-50/70 border-2 border-dashed",
    preview: "border-emerald-500 bg-emerald-50/80",
    previewText: "text-emerald-700",
  },
} as const;

const GRID_START = 7;
const GRID_END = 20;
const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);

function timeToY(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - GRID_START) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

interface Props {
  reservas: Reserva[];
  onNewReserva: (sala: string, fecha: string) => void;
  onLiberar: (id: string) => void;
  onReactivar: (id: string) => void;
  onEliminar: (id: string) => void;
  onMoverReserva: (
    id: string,
    sala: string,
    fecha: string,
    horaInicio: string,
    horaFin: string
  ) => void;
  onDayChange?: (date: Date) => void;
}

export function CalendarView({
  reservas,
  onNewReserva,
  onLiberar,
  onReactivar,
  onEliminar,
  onMoverReserva,
  onDayChange,
}: Props) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [dragOverSala, setDragOverSala] = useState<string | null>(null);
  const [detailReserva, setDetailReserva] = useState<Reserva | null>(null);
  const [dragMeta, setDragMeta] = useState<{ offsetY: number; durationMinutes: number } | null>(null);
  const [dragPreviewY, setDragPreviewY] = useState<number | null>(null);

  const selectDay = (day: Date) => {
    setSelectedDay(day);
    onDayChange?.(day);
  };

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const selectedDateStr = format(selectedDay, "yyyy-MM-dd");
  const totalGridHeight = HOURS.length * HOUR_HEIGHT;

  const reservasByRoom = useMemo(() => {
    const map: Record<string, Reserva[]> = {};
    for (const sala of SALAS) {
      map[sala] = reservas
        .filter((r) => r.sala === sala && r.fecha === selectedDateStr)
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    }
    return map;
  }, [reservas, selectedDateStr]);

  // Compute drag preview times from current Y position in the drop target
  let dragPreview: { startY: number; endY: number; label: string } | null = null;
  if (dragMeta && dragPreviewY !== null) {
    const minutesFromStart = Math.round(((dragPreviewY / HOUR_HEIGHT) * 60) / 15) * 15;
    let startMins = GRID_START * 60 + minutesFromStart;
    let endMins = startMins + dragMeta.durationMinutes;
    if (endMins > GRID_END * 60) {
      endMins = GRID_END * 60;
      startMins = endMins - dragMeta.durationMinutes;
    }
    startMins = Math.max(GRID_START * 60, startMins);
    const startY = timeToY(minsToTime(startMins));
    const endY = timeToY(minsToTime(endMins));
    dragPreview = { startY, endY, label: `${minsToTime(startMins)} – ${minsToTime(endMins)}` };
  }

  const isDraggingAny = dragOverSala !== null;

  const clearDragState = () => {
    setDragMeta(null);
    setDragPreviewY(null);
    setDragOverSala(null);
  };

  const handleDragOver = (e: React.DragEvent, sala: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverSala !== sala) setDragOverSala(sala);

    if (dragMeta) {
      const rect = e.currentTarget.getBoundingClientRect();
      const rawY = e.clientY - rect.top - dragMeta.offsetY;
      setDragPreviewY(Math.max(0, rawY));
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragOverSala(null);
      setDragPreviewY(null);
    }
  };

  const handleDrop = (e: React.DragEvent, sala: string) => {
    e.preventDefault();
    e.stopPropagation();
    clearDragState();

    const rawData = e.dataTransfer.getData("application/json");
    if (!rawData) return;

    let parsed: { reservaId: string; offsetY: number; durationMinutes: number };
    try {
      parsed = JSON.parse(rawData);
    } catch {
      return;
    }

    const { reservaId, offsetY, durationMinutes } = parsed;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawY = e.clientY - rect.top - offsetY;
    const clampedY = Math.max(0, rawY);

    const minutesFromStart = Math.round(((clampedY / HOUR_HEIGHT) * 60) / 15) * 15;
    let startMins = GRID_START * 60 + minutesFromStart;
    let endMins = startMins + durationMinutes;

    if (endMins > GRID_END * 60) {
      endMins = GRID_END * 60;
      startMins = endMins - durationMinutes;
    }
    startMins = Math.max(GRID_START * 60, startMins);

    onMoverReserva(reservaId, sala, selectedDateStr, minsToTime(startMins), minsToTime(endMins));
  };

  return (
    <div className="flex flex-col select-none">
      {/* Week navigation */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setWeekStart((d) => subWeeks(d, 1))}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors text-xl font-light"
        >
          ‹
        </button>

        <div className="flex-1 grid grid-cols-7 gap-0.5 min-w-0">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDay);
            const isToday = isSameDay(day, new Date());
            const dateStr = format(day, "yyyy-MM-dd");
            const hasDot = reservas.some((r) => r.fecha === dateStr && r.estado === "reservado");

            return (
              <button
                key={day.toISOString()}
                onClick={() => selectDay(day)}
                className={clsx(
                  "flex flex-col items-center py-2 px-0.5 rounded-xl transition-all duration-150",
                  isSelected
                    ? "bg-blue-600 text-white shadow-md"
                    : isToday
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "hover:bg-gray-100 text-gray-600 border border-transparent"
                )}
              >
                <span className="text-xs font-medium capitalize leading-tight">
                  {format(day, "EEE", { locale: es }).slice(0, 3)}
                </span>
                <span className="text-sm font-bold leading-tight">{format(day, "d")}</span>
                <span
                  className={clsx(
                    "w-1.5 h-1.5 rounded-full mt-0.5 transition-opacity",
                    hasDot && !isSelected ? "opacity-100" : "opacity-0",
                    isToday ? "bg-blue-400" : "bg-gray-400"
                  )}
                />
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setWeekStart((d) => addWeeks(d, 1))}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors text-xl font-light"
        >
          ›
        </button>
      </div>

      {/* Day title */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-base font-bold text-gray-900 capitalize">
          {format(selectedDay, "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </h2>
        {!isSameDay(selectedDay, new Date()) && (
          <button
            onClick={() => {
              const today = new Date();
              selectDay(today);
              setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Hoy
          </button>
        )}
      </div>

      {/* Hint */}
      {reservas.some((r) => r.fecha === selectedDateStr && r.estado === "reservado") && (
        <p className="text-xs text-gray-400 text-center mb-3">
          Arrastra para mover · Toca para ver detalles
        </p>
      )}

      {/* Time grid */}
      <div className="flex gap-0 overflow-x-auto pb-2">
        {/* Time labels */}
        <div className="w-12 flex-shrink-0 relative" style={{ height: totalGridHeight + 32 }}>
          <div className="h-8" />
          {HOURS.map((h, i) => (
            <div
              key={h}
              className="absolute right-1 text-xs text-gray-400 font-medium"
              style={{ top: 32 + i * HOUR_HEIGHT - 8 }}
            >
              {h.toString().padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Room columns */}
        <div
          className="grid grid-cols-3 gap-2 flex-1"
          style={{ minWidth: "330px" }}
        >
          {SALAS.map((sala) => {
            const styles = SALA_STYLES[sala];
            const salaReservas = reservasByRoom[sala];
            const activeCount = salaReservas.filter((r) => r.estado === "reservado").length;
            const isDragTarget = dragOverSala === sala;

            return (
              <div key={sala} className="min-w-0 flex flex-col">
                {/* Room header */}
                <div
                  className={clsx(
                    "flex items-center justify-between px-2 py-1.5 rounded-t-xl h-8 cursor-pointer group",
                    styles.header
                  )}
                  onClick={() => onNewReserva(sala, selectedDateStr)}
                  title={`Nueva reserva en ${sala}`}
                >
                  <span className="text-xs font-bold tracking-wide truncate">{sala}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {activeCount > 0 && (
                      <span className="text-xs bg-white/25 px-1.5 py-0.5 rounded-full font-semibold">
                        {activeCount}
                      </span>
                    )}
                    <span className="text-white/70 group-hover:text-white text-base leading-none transition-colors">
                      +
                    </span>
                  </div>
                </div>

                {/* Grid body */}
                <div
                  className={clsx(
                    "relative border border-t-0 rounded-b-xl overflow-hidden transition-all duration-100",
                    isDragTarget ? styles.dragOver : `${styles.body} ${styles.border}`,
                    "cursor-pointer"
                  )}
                  style={{ height: totalGridHeight }}
                  onClick={() => onNewReserva(sala, selectedDateStr)}
                  onDragOver={(e) => handleDragOver(e, sala)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, sala)}
                >
                  {/* Hour lines — darker while dragging */}
                  {HOURS.map((_, i) => (
                    <div
                      key={i}
                      className={clsx(
                        "absolute left-0 right-0 border-t transition-colors",
                        isDraggingAny ? "border-gray-300" : "border-gray-100"
                      )}
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}
                  {/* Half-hour dashes */}
                  {HOURS.map((_, i) => (
                    <div
                      key={`hh-${i}`}
                      className={clsx(
                        "absolute left-3 right-3 border-t border-dashed transition-colors",
                        isDraggingAny ? "border-gray-200" : "border-gray-100"
                      )}
                      style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                    />
                  ))}

                  {/* Drag preview: dashed outline + floating time badge above */}
                  {isDragTarget && dragPreview && (
                    <>
                      <div
                        className={clsx(
                          "absolute left-1 right-1 rounded-lg border-2 border-dashed z-20 pointer-events-none",
                          styles.preview
                        )}
                        style={{
                          top: dragPreview.startY,
                          height: Math.max(dragPreview.endY - dragPreview.startY, 28),
                        }}
                      />
                      <div
                        className={clsx(
                          "absolute left-1 right-1 z-30 pointer-events-none flex justify-center"
                        )}
                        style={{ top: Math.max(0, dragPreview.startY - 22) }}
                      >
                        <span
                          className={clsx(
                            "text-xs font-bold px-2 py-0.5 rounded-full shadow-md",
                            styles.previewText,
                            "bg-white border",
                            dragOverSala === "Sala Recepcion"
                              ? "border-blue-300"
                              : dragOverSala === "Sala Juntas"
                              ? "border-violet-300"
                              : "border-emerald-300"
                          )}
                        >
                          {dragPreview.label}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Reservation blocks */}
                  {salaReservas.map((reserva) => {
                    const top = timeToY(reserva.horaInicio);
                    const height = timeToY(reserva.horaFin) - top;
                    return (
                      <ReservationBlock
                        key={reserva.id}
                        reserva={reserva}
                        top={top}
                        height={Math.max(height, 28)}
                        onDetails={setDetailReserva}
                        onDragStarted={(offsetY, durationMinutes) =>
                          setDragMeta({ offsetY, durationMinutes })
                        }
                        onDragEnded={clearDragState}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ReservationDetailModal
        key={detailReserva?.id ?? "none"}
        reserva={detailReserva}
        onClose={() => setDetailReserva(null)}
        onLiberar={onLiberar}
        onReactivar={onReactivar}
        onEliminar={onEliminar}
      />
    </div>
  );
}
