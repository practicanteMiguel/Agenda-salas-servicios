import { useState, useEffect, useCallback } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Reserva, FormReserva } from "@/types";
import { format, startOfMonth, subMonths } from "date-fns";

export function useReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const thisMonth = format(startOfMonth(now), "yyyy-MM");
    const lastMonth = format(startOfMonth(subMonths(now, 1)), "yyyy-MM");

    const unsubscribe = onSnapshot(
      collection(db, "reservas"),
      (snapshot) => {
        const data: Reserva[] = [];
        snapshot.forEach((docSnap) => {
          const r = { id: docSnap.id, ...docSnap.data() } as Reserva;
          if (r.fecha.startsWith(thisMonth) || r.fecha.startsWith(lastMonth)) {
            data.push(r);
          }
        });
        setReservas(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const findConflict = useCallback(
    (sala: string, fecha: string, horaInicio: string, horaFin: string, excludeId?: string): Reserva | null => {
      return (
        reservas.find(
          (r) =>
            r.sala === sala &&
            r.fecha === fecha &&
            r.estado === "reservado" &&
            r.id !== excludeId &&
            horaInicio < r.horaFin &&
            horaFin > r.horaInicio
        ) ?? null
      );
    },
    [reservas]
  );

  const buildConflictError = useCallback(
    (conflict: Reserva, sala: string, fecha: string, excludeId?: string): string => {
      const nextAfter = reservas
        .filter(
          (r) =>
            r.sala === sala &&
            r.fecha === fecha &&
            r.estado === "reservado" &&
            r.id !== conflict.id &&
            r.id !== excludeId &&
            r.horaInicio >= conflict.horaFin
        )
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))[0];
      const hasta = nextAfter ? nextAfter.horaInicio : "20:00";
      return `Ya hay una reserva de ${conflict.horaInicio}–${conflict.horaFin} (${conflict.solicitante}). Puede agendar desde ${conflict.horaFin} hasta ${hasta}.`;
    },
    [reservas]
  );

  const crearReserva = useCallback(
    async (data: FormReserva): Promise<{ success: boolean; error?: string }> => {
      const conflict = findConflict(data.sala, data.fecha, data.horaInicio, data.horaFin);
      if (conflict) {
        return { success: false, error: buildConflictError(conflict, data.sala, data.fecha) };
      }
      try {
        await addDoc(collection(db, "reservas"), { ...data, estado: "reservado" });
        return { success: true };
      } catch {
        return { success: false, error: "Error al guardar en Firebase." };
      }
    },
    [findConflict, buildConflictError]
  );

  const moverReserva = useCallback(
    async (
      id: string,
      nuevaSala: string,
      fecha: string,
      nuevaHoraInicio: string,
      nuevaHoraFin: string
    ): Promise<{ success: boolean; error?: string }> => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const ct = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      if (fecha === today && nuevaHoraInicio < ct) {
        return { success: false, error: "No puedes mover una reserva a una hora que ya paso." };
      }

      const conflict = findConflict(nuevaSala, fecha, nuevaHoraInicio, nuevaHoraFin, id);
      if (conflict) {
        return {
          success: false,
          error: `No puedes mover la reserva ahi. ${conflict.sala} ya tiene una reserva de ${conflict.horaInicio}–${conflict.horaFin} (${conflict.solicitante}).`,
        };
      }
      try {
        await updateDoc(doc(db, "reservas", id), {
          sala: nuevaSala,
          horaInicio: nuevaHoraInicio,
          horaFin: nuevaHoraFin,
        });
        return { success: true };
      } catch {
        return { success: false, error: "Error al mover la reserva." };
      }
    },
    [findConflict, buildConflictError]
  );

  const liberarSala = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await updateDoc(doc(db, "reservas", id), { estado: "libre" });
        return { success: true };
      } catch {
        return { success: false, error: "Error al liberar la sala." };
      }
    },
    []
  );

  const reactivarSala = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await updateDoc(doc(db, "reservas", id), { estado: "reservado" });
        return { success: true };
      } catch {
        return { success: false, error: "Error al reactivar la reserva." };
      }
    },
    []
  );

  const eliminarReserva = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await deleteDoc(doc(db, "reservas", id));
        return { success: true };
      } catch {
        return { success: false, error: "Error al eliminar la reserva." };
      }
    },
    []
  );

  return {
    reservas,
    loading,
    error,
    crearReserva,
    moverReserva,
    liberarSala,
    reactivarSala,
    eliminarReserva,
  };
}
