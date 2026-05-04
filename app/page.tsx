"use client";

import { useState, useEffect } from "react";
import { CalendarView } from "@/components/CalendarView";
import { ReservationModal } from "@/components/ReservationModal";
import { useReservas } from "@/hooks/useReservas";
import { useToast } from "@/components/ToastContext";
import { FormReserva, Reserva } from "@/types";

const SALAS = ["Sala Recepcion", "Sala Juntas", "Sala Operaciones"] as const;

function roundUpTo15(date: Date): { horaInicio: string; horaFin: string } {
  const h = date.getHours();
  const m = date.getMinutes();
  const roundedM = Math.ceil(m / 15) * 15;
  const totalStart = Math.min(19 * 60 + 45, Math.max(7 * 60, h * 60 + roundedM));
  const totalEnd = Math.min(20 * 60, totalStart + 60);
  const fmt = (mins: number) =>
    `${Math.floor(mins / 60).toString().padStart(2, "0")}:${(mins % 60).toString().padStart(2, "0")}`;
  return { horaInicio: fmt(totalStart), horaFin: fmt(totalEnd) };
}

export default function Page() {
  const { reservas, loading, error, crearReserva, moverReserva, liberarSala, reactivarSala, eliminarReserva } =
    useReservas();
  const { showToast } = useToast();

  // Tick every minute so the real-time status stays accurate
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSala, setModalSala] = useState("Sala 1");
  const [modalFecha, setModalFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalHoraInicio, setModalHoraInicio] = useState("09:00");
  const [modalHoraFin, setModalHoraFin] = useState("10:00");
  const [submitting, setSubmitting] = useState(false);

  const openModal = (sala: string, fecha: string, horaInicio?: string, horaFin?: string) => {
    setModalSala(sala);
    setModalFecha(fecha);
    setModalHoraInicio(horaInicio ?? "09:00");
    setModalHoraFin(horaFin ?? "10:00");
    setModalOpen(true);
  };

  // Returns the active reservation right now for a room, or null
  function getReservaActual(sala: string): Reserva | null {
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    const currentTime = `${hh}:${mm}`;
    const todayStr = now.toISOString().slice(0, 10);
    return (
      reservas.find(
        (r) =>
          r.sala === sala &&
          r.fecha === todayStr &&
          r.estado === "reservado" &&
          r.horaInicio <= currentTime &&
          r.horaFin > currentTime
      ) ?? null
    );
  }

  // --- Handlers ---

  const handleSubmit = async (data: FormReserva) => {
    setSubmitting(true);
    const result = await crearReserva(data);
    setSubmitting(false);
    if (result.success) {
      setModalOpen(false);
      showToast("success", `Reserva creada: ${data.sala}, ${data.fecha} ${data.horaInicio}–${data.horaFin}`);
    } else {
      showToast("error", result.error ?? "Error al crear la reserva");
    }
  };

  const handleLiberar = async (id: string) => {
    const result = await liberarSala(id);
    if (result.success) showToast("success", "Sala liberada");
    else showToast("error", result.error ?? "Error al liberar");
  };

  const handleReactivar = async (id: string) => {
    const result = await reactivarSala(id);
    if (result.success) showToast("success", "Reserva reactivada");
    else showToast("error", result.error ?? "Error al reactivar");
  };

  const handleEliminar = async (id: string) => {
    const result = await eliminarReserva(id);
    if (result.success) showToast("warning", "Reserva eliminada");
    else showToast("error", result.error ?? "Error al eliminar");
  };

  const handleMover = async (
    id: string,
    sala: string,
    fecha: string,
    horaInicio: string,
    horaFin: string
  ) => {
    const result = await moverReserva(id, sala, fecha, horaInicio, horaFin);
    if (result.success) {
      showToast("success", `Movida a ${sala} ${horaInicio}–${horaFin}`);
    } else {
      showToast("error", result.error ?? "No se pudo mover la reserva");
    }
  };

  const ocuparAhora = (sala: string) => {
    const { horaInicio, horaFin } = roundUpTo15(now);
    openModal(sala, now.toISOString().slice(0, 10), horaInicio, horaFin);
  };

  // --- Loading / error screens ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <img src="/assets/logo-full.png" alt="Logo" className="h-40 mx-auto mb-4 object-contain" />
          
          <p className="text-gray-500 text-sm mb-4 font-medium">Cargando sistema de reservas...</p>

          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl font-bold">!</span>
          </div>
          <p className="font-bold text-gray-900 mb-1">Error de conexion</p>
          <p className="text-sm text-gray-500 mb-3">{error}</p>
          <p className="text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-2">
            Verifica que el archivo <code className="font-mono">.env.local</code> exista con las
            credenciales de Firebase.
          </p>
        </div>
      </div>
    );
  }

  const realToday = new Date().toISOString().slice(0, 10);
  const selectedDateStr = selectedDate.toISOString().slice(0, 10);
  const isViewingToday = selectedDateStr === realToday;
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/logo-icon.png" alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Agenda de Salas Servicios Asociados</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Gestion de salas de juntas</p>
            </div>
          </div>
          <button
            onClick={() => openModal("Sala Recepcion", selectedDateStr)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">Nueva reserva</span>
            <span className="sm:hidden">Reservar</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SALAS.map((sala) => {
            // Real-time occupied status only applies to today
            const reservaActual = isViewingToday ? getReservaActual(sala) : null;
            const ocupada = reservaActual !== null;
            const totalDia = reservas.filter(
              (r) => r.sala === sala && r.fecha === selectedDateStr
            ).length;
            const proxima =
              reservas
                .filter(
                  (r) =>
                    r.sala === sala &&
                    r.fecha === selectedDateStr &&
                    r.estado === "reservado" &&
                    r.horaInicio > (isViewingToday ? currentTime : "")
                )
                .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))[0] ?? null;

            return (
              <div
                key={sala}
                className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-500">{sala}</p>
                  {isViewingToday && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        ocupada ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {ocupada ? "Ocupada" : "Libre"}
                    </span>
                  )}
                </div>

                {ocupada ? (
                  <>
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {reservaActual!.solicitante}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {reservaActual!.area} · hasta {reservaActual!.horaFin}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xl font-bold text-gray-900">{totalDia}</p>
                      {proxima ? (
                        <p className="text-xs text-gray-400 text-right">
                          sig: {proxima.horaInicio}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">sin mas reservas</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-gray-900">{totalDia}</p>
                    {proxima ? (
                      <p className="text-xs text-gray-400">
                        proxima: {proxima.horaInicio} ({proxima.solicitante})
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">
                        {totalDia === 0 ? "sin reservas este dia" : "sin mas reservas"}
                      </p>
                    )}
                  </>
                )}

                {/* "Ocupar ahora" solo cuando se ve hoy y la sala esta libre */}
                {isViewingToday && !ocupada && (
                  <button
                    onClick={() => ocuparAhora(sala)}
                    className="mt-2 w-full text-xs text-blue-600 hover:text-blue-700 font-semibold py-1 rounded-lg hover:bg-blue-50 transition-colors border border-blue-100"
                  >
                    Ocupar ahora
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Calendar card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <CalendarView
            reservas={reservas}
            onNewReserva={openModal}
            onLiberar={handleLiberar}
            onReactivar={handleReactivar}
            onEliminar={handleEliminar}
            onMoverReserva={handleMover}
            onDayChange={setSelectedDate}
          />
        </div>
      </main>

      <ReservationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        defaultSala={modalSala}
        defaultFecha={modalFecha}
        defaultHoraInicio={modalHoraInicio}
        defaultHoraFin={modalHoraFin}
        loading={submitting}
      />
    </div>
  );
}
