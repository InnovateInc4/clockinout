import React from "react";

const TicketList = (props) => {
    // This safety check prevents the "undefined" crash
    if (!props.ticketInfo) {
        return <p>Loading farm tickets...</p>;
    }

    return (
        <div>
            <select className="form-control" name="ticketList" onChange={() => props.populateFields()}>
                <option value="default">Select a ticket</option>
                {props.ticketInfo.map((ticket, i) => (
                    <option key={i} data-level={ticket.priority} value={ticket.ticketId}>
                        {ticket.ticketId.substring(ticket.ticketId.lastIndexOf(":") + 1)} (priority: {ticket.priority})
                    </option>
                ))}
            </select>
        </div>
    );
};

export default TicketList;