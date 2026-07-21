const timestamp = () => {
    let d = new Date();
    // This creates a format like "2024-05-24T10:30" which matches your substring logic
    let year = d.getFullYear();
    let month = ("0" + (d.getMonth() + 1)).slice(-2);
    let day = ("0" + d.getDate()).slice(-2);
    let hour = ("0" + d.getHours()).slice(-2);
    let minute = ("0" + d.getMinutes()).slice(-2);
    
    return `${year}-${month}-${day}T${hour}:${minute}`;
};

export default timestamp;