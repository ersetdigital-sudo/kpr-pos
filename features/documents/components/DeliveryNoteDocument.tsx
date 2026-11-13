import { DeliveryNoteA4Document } from "@/features/documents/components/DeliveryNoteA4Document";
import { DeliveryNoteDotMatrixDocument } from "@/features/documents/components/DeliveryNoteDotMatrixDocument";
import type {
  DeliveryNotePaper,
  DeliveryNoteViewData,
} from "@/features/documents/types";

interface DeliveryNoteDocumentProps {
  data: DeliveryNoteViewData;
  paper: DeliveryNotePaper;
}

export function DeliveryNoteDocument({
  data,
  paper,
}: DeliveryNoteDocumentProps) {
  return paper === "a4" ? (
    <DeliveryNoteA4Document data={data} />
  ) : (
    <DeliveryNoteDotMatrixDocument data={data} />
  );
}
