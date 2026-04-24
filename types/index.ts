export type EstadoReserva = "reservado" | "libre";

export interface Reserva {
  id: string;
  sala: string;
  fecha: string;       // YYYY-MM-DD
  horaInicio: string;  // HH:mm
  horaFin: string;     // HH:mm
  solicitante: string;
  area: string;
  estado: EstadoReserva;
}

export type FormReserva = Omit<Reserva, "id" | "estado">;

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning";
  message: string;
}
