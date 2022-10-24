import { VertexManager } from "@ovvio/cfds/lib/client/graph/vertex-manager";
import { Note } from "@ovvio/cfds/lib/client/graph/vertices";
import { useEffect } from "react";
import { useFocused } from "slate-react";
import { useEventLogger } from "../../../../core/analytics";

interface FocusReporterProps {
  cardManager: VertexManager<Note>;
  source: string
}

export function FocusReporter({ cardManager, source}: FocusReporterProps) {
  const focused = useFocused();
   const eventLogger = useEventLogger();

  useEffect(() => {
    if (focused) {
      eventLogger.cardAction('EDITOR_FOCUSED', cardManager, {
        source
      });
    }
  }, [focused, eventLogger, cardManager, source]);

  return null;
}