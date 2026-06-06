import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearStoredActiveEventIdForCurrentUser,
  resolveActiveEventFromEventsForCurrentUser,
  setStoredActiveEventIdForCurrentUser,
} from "../services/activeEventService.js";
import { getEvents } from "../services/eventsService.js";

const ActiveEventContext = createContext(null);

export function ActiveEventProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshActiveEvent = useCallback(async () => {
    setLoading(true);
    try {
      const freshEvents = await getEvents({ fresh: true });
      const { activeEvent: resolvedEvent } = await resolveActiveEventFromEventsForCurrentUser(freshEvents);
      setEvents(freshEvents);
      setActiveEvent(resolvedEvent);
      return { events: freshEvents, activeEvent: resolvedEvent };
    } catch (error) {
      console.error("Unable to resolve active event.", error);
      setEvents([]);
      setActiveEvent(null);
      return { events: [], activeEvent: null };
    } finally {
      setLoading(false);
    }
  }, []);

  const selectActiveEvent = useCallback(
    async (eventId) => {
      if (!eventId) {
        await clearStoredActiveEventIdForCurrentUser();
        setActiveEvent(null);
        window.dispatchEvent(new Event("rankify-active-event-changed"));
        return null;
      }

      const currentEvents = events.length ? events : await getEvents({ fresh: true });
      const resolvedEvent = currentEvents.find((event) => String(event.id) === String(eventId)) || null;

      if (!resolvedEvent) {
        await clearStoredActiveEventIdForCurrentUser();
        setEvents(currentEvents);
        setActiveEvent(null);
        window.dispatchEvent(new Event("rankify-active-event-changed"));
        return null;
      }

      await setStoredActiveEventIdForCurrentUser(resolvedEvent.id);
      setEvents(currentEvents);
      setActiveEvent(resolvedEvent);
      window.dispatchEvent(new Event("rankify-active-event-changed"));
      return resolvedEvent;
    },
    [events]
  );

  const clearActiveEvent = useCallback(async () => {
    await clearStoredActiveEventIdForCurrentUser();
    setActiveEvent(null);
    window.dispatchEvent(new Event("rankify-active-event-changed"));
  }, []);

  useEffect(() => {
    refreshActiveEvent();

    const sync = () => {
      refreshActiveEvent();
    };

    window.addEventListener("storage", sync);
    window.addEventListener("rankify-events-changed", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("rankify-events-changed", sync);
    };
  }, [refreshActiveEvent]);

  const value = useMemo(
    () => ({
      activeEvent,
      activeEventId: activeEvent?.id || "",
      clearActiveEvent,
      events,
      loading,
      refreshActiveEvent,
      selectActiveEvent,
    }),
    [activeEvent, clearActiveEvent, events, loading, refreshActiveEvent, selectActiveEvent]
  );

  return <ActiveEventContext.Provider value={value}>{children}</ActiveEventContext.Provider>;
}

export function useActiveEvent() {
  const context = useContext(ActiveEventContext);
  if (!context) {
    throw new Error("useActiveEvent must be used within ActiveEventProvider");
  }
  return context;
}
