import React, {useEffect, useRef, useState} from "react";

const App = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const logsEndRef = useRef(null);


    const eventStream = (event) => {
        const eventSource = new EventSource("http://localhost:3000/events");

        eventSource.onmessage = (event) => {
            setLogs((prevLogs) => [...prevLogs, event.data]);
        };

        eventSource.onerror = (err) => {
            console.error("Error receiving event stream:", err);
            setLogs((prevLogs) => [...prevLogs, "Error connecting to server."]);
            eventSource.close();
            setLoading(false);
        };

        eventSource.onopen = () => {
            console.log("Connection to event stream opened.");
        };

        eventSource.addEventListener("done", () => {
            eventSource.close();
            setLoading(false);
        });
    }

    const handleCreateApp = async () => {
        setLogs([]);
        setLoading(true);
        const response = await fetch("http://localhost:3000/create-react-app", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                appName: `reactapp-${Date.now().toString()}`,
            })
        });
        const data = await response.json();
        if (data) {
            alert("app creation started")
        }
    };

    useEffect(() => {
        eventStream()
    }, []);

    // Handle logs scroll
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({behavior: "smooth"});
        }
    }, [logs]);

    return (
        <div style={{padding: "20px", fontFamily: "Arial, sans-serif"}}>
            <h1>Create React App</h1>
            <button
                onClick={handleCreateApp}
                disabled={loading}
                style={{
                    padding: "10px 20px",
                    fontSize: "16px",
                    cursor: loading ? "not-allowed" : "pointer",
                    backgroundColor: loading ? "#ccc" : "#007bff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "5px",
                }}
            >
                {loading ? "Creating..." : "Create React App"}
            </button>

            <div style={{marginTop: "20px", backgroundColor: "#f9f9f9", padding: "10px", borderRadius: "5px"}}>
                <h2>Logs:</h2>
                <div
                    style={{
                        height: "400px",
                        overflowY: "auto",
                        border: "1px solid #ccc",
                        padding: "10px",
                        borderRadius: "5px",
                        backgroundColor: "#fff",
                    }}
                >
                    {logs.length > 0 ? (
                        <>
                            {logs.map((log, index) => (
                                <p key={index} style={{margin: "5px 0"}}>
                                    {log}
                                </p>
                            ))}
                            <div ref={logsEndRef}/>
                        </>
                    ) : (
                        <p>No logs yet. Click the button to start.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
