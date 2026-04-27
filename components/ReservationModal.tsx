"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import { FormReserva } from "@/types";

const SALAS = ["Sala Recepcion", "Sala Juntas", "Sala Operaciones"];

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormReserva) => Promise<void>;
  defaultSala?: string;
  defaultFecha?: string;
  defaultHoraInicio?: string;
  defaultHoraFin?: string;
  loading?: boolean;
}

export function ReservationModal({
  open,
  onClose,
  onSubmit,
  defaultSala = "Sala 1",
  defaultFecha = "",
  defaultHoraInicio = "09:00",
  defaultHoraFin = "10:00",
  loading = false,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormReserva>();

  useEffect(() => {
    if (open) {
      reset({
        sala: defaultSala,
        fecha: defaultFecha || new Date().toISOString().slice(0, 10),
        horaInicio: defaultHoraInicio,
        horaFin: defaultHoraFin,
        solicitante: "",
        area: "",
      });
    }
  }, [open, defaultSala, defaultFecha, defaultHoraInicio, defaultHoraFin, reset]);

  if (!open) return null;

  const horaInicio = watch("horaInicio");

  const inputClass =
    "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[16px] bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none text-left [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:block min-h-[44px]";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
  const errorClass = "text-red-500 text-xs mt-1";

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl animate-fade-in overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nueva Reserva</h2>
            <p className="text-sm text-gray-400 mt-0.5">Completa los datos de la reserva</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          {/* Sala */}
          <div>
            <label className={labelClass}>Sala</label>
            <select {...register("sala", { required: true })} className={inputClass}>
              {SALAS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className={labelClass}>Fecha</label>
            <input
              type="date"
              {...register("fecha", { required: "La fecha es requerida" })}
              className={inputClass}
            />
            {errors.fecha && <p className={errorClass}>{errors.fecha.message}</p>}
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Hora inicio</label>
              <input
                type="time"
                min="07:00"
                max="19:30"
                {...register("horaInicio", { required: "Requerido" })}
                className={inputClass}
              />
              {errors.horaInicio && <p className={errorClass}>{errors.horaInicio.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Hora fin</label>
              <input
                type="time"
                min="07:30"
                max="20:00"
                {...register("horaFin", {
                  required: "Requerido",
                  validate: (v) => v > horaInicio || "Debe ser posterior al inicio",
                })}
                className={inputClass}
              />
              {errors.horaFin && <p className={errorClass}>{errors.horaFin.message}</p>}
            </div>
          </div>

          {/* Solicitante */}
          <div>
            <label className={labelClass}>Solicitante</label>
            <input
              type="text"
              placeholder="Nombre completo"
              {...register("solicitante", { required: "El nombre del solicitante es requerido" })}
              className={inputClass}
            />
            {errors.solicitante && <p className={errorClass}>{errors.solicitante.message}</p>}
          </div>

          {/* Area */}
          <div>
            <label className={labelClass}>Area / Departamento</label>
            <input
              type="text"
              placeholder="Ej: Recursos Humanos, TI, Comercial..."
              {...register("area", { required: "El area es requerida" })}
              className={inputClass}
            />
            {errors.area && <p className={errorClass}>{errors.area.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={clsx(
                "flex-1 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm",
                loading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
              )}
            >
              {loading ? "Guardando..." : "Crear Reserva"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
