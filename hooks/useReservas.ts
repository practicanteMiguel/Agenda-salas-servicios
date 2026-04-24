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

  // excludeId ignores that reservation when checking conflicts (used when moving)
  const checkConflict = useCallback(
    (
      sala: string,
      fecha: string,
      horaInicio: string,
      horaFin: string,
      excludeId?: string
    ): boolean => {
      return reservas.some(
        (r) =>
          r.sala === sala &&
          r.fecha === fecha &&
          r.estado === "reservado" &&
          r.id !== excludeId &&
          horaInicio < r.horaFin &&
          horaFin > r.horaInicio
      );
    },
    [reservas]
  );

  const crearReserva = useCallback(
    async (data: FormReserva): Promise<{ success: boolean; error?: string }> => {
      if (checkConflict(data.sala, data.fecha, data.horaInicio, data.horaFin)) {
        return {
          success: false,
          error: "Conflicto de horario: ya existe una reserva en ese periodo.",
        };
      }
      try {
        await addDoc(collection(db, "reservas"), { ...data, estado: "reservado" });
        return { success: true };
      } catch {
        return { success: false, error: "Error al guardar en Firebase." };
      }
    },
    [checkConflict]
  );

  const moverReserva = useCallback(
    async (
      id: string,
      nuevaSala: string,
      fecha: string,
      nuevaHoraInicio: string,
      nuevaHoraFin: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (checkConflict(nuevaSala, fecha, nuevaHoraInicio, nuevaHoraFin, id)) {
        return {
          success: false,
          error: "Conflicto: ya hay una reserva en ese horario.",
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
    [checkConflict]
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
