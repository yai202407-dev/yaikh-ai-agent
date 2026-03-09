export const formatTimestamp = (date: Date = new Date()): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
