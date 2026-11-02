import { fetchEmployeeSnapshotAction } from "@/features/karyawan/actions";
import { updateDatabase } from "@/lib/store/store";

let inFlight: Promise<void> | null = null;

/** Tarik daftar karyawan terbaru agar status nonaktif langsung terlihat. */
export function syncEmployeesFromCloud(): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = fetchEmployeeSnapshotAction()
    .then((employees) => {
      if (employees.length === 0) return;

      updateDatabase((database) => ({
        ...database,
        employees: employees.map((employee) => ({ ...employee })),
      }));
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
