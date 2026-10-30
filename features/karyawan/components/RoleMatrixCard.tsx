import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ALL_ROLES } from "@/constants/roles";
import { buildRoleMatrix } from "@/features/karyawan/data/karyawan-calculations";

export function RoleMatrixCard() {
  const rows = buildRoleMatrix();

  return (
    <Card className="flex flex-col gap-3.5 p-[18px]">
      <div>
        <h2 className="m-0 text-card-title font-bold text-ink">
          Hak Akses per Role
        </h2>
        <p className="mt-0.5 mb-0 text-label text-ink-muted">
          Menu yang bisa dibuka tiap role, diambil dari config navigasi.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table
          aria-label="Matriks hak akses role"
          className="w-full border-collapse text-body"
          style={{ minWidth: 900 }}
        >
          <thead>
            <tr className="bg-line-subtle text-left text-meta text-ink-muted">
              <th className="px-2 py-[10px] font-semibold">Menu</th>
              {ALL_ROLES.map((role) => (
                <th
                  key={role}
                  scope="col"
                  className="px-2 py-[10px] text-center font-semibold"
                >
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.menu} className="border-t border-line-faint">
                <th
                  scope="row"
                  className="px-2 py-2.5 text-left font-semibold text-ink"
                >
                  {row.menu}
                  <span className="ml-2 text-meta font-normal text-ink-muted">
                    {row.section}
                  </span>
                </th>
                {ALL_ROLES.map((role) => (
                  <td key={role} className="px-2 py-2.5 text-center">
                    {row.access[role] ? (
                      <Icon
                        name="check"
                        size={16}
                        strokeWidth={2.4}
                        className="mx-auto text-success-ink"
                      />
                    ) : (
                      <Icon
                        name="close"
                        size={14}
                        strokeWidth={2}
                        className="mx-auto text-line-dashed"
                      />
                    )}
                    <span className="sr-only">
                      {row.access[role] ? "Bisa diakses" : "Tidak bisa diakses"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
