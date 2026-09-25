const NumberToTime = (num) => {
    if (!num || num === "noTimeYet") return "N/A";
    const date = new Date(Number(num));
    return date.toLocaleString(); // Example: "1/11/2026, 1:15:00 PM"
};
export default NumberToTime;