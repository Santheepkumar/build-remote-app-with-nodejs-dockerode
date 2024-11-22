import React, {useEffect, useRef, useState} from "react";

const App = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [appName, setAppName] = useState(`reactapp-${Date.now().toString()}`);
    const logsEndRef = useRef(null);


    const eventStreamAsync = (appName) => {
        const eventSource = new EventSource(`http://localhost:3000/events/${appName}`)
        return new Promise((resolve, reject) => {
            eventSource.onmessage = (event) => {
                if (event.data === '"CloseEvent"') {
                    eventSource.close();
                    alert("Build generated on your server")
                    setLoading(false);
                }
                setLogs((prevLogs) => [...prevLogs, event.data]);
            };

            eventSource.onerror = (err) => {
                console.error("Error receiving event stream:", err);
                setLogs((prevLogs) => [...prevLogs, "Error connecting to server."]);
                eventSource.close();
                setLoading(false);
                reject("Event not connected")
            };

            eventSource.onopen = () => {
                console.log("Connection to event stream opened.");
                resolve('Evert connected')
            };

            eventSource.addEventListener("done", () => {
                eventSource.close();
                console.log("Connection to event stream closed");
                setLoading(false);
            });
        })
    }

    const handleCreateApp = async () => {
        setLogs([]);
        setLoading(true);
        await eventStreamAsync(appName)
        const response = await fetch("http://localhost:3000/create-react-app", {
            method: "POST", headers: {
                'Content-Type': 'application/json'
            }, body: JSON.stringify({
                appName: appName || `reactapp-${Date.now().toString()}`,
            })
        });
        const data = await response.json();
        if (data) {
            alert("app creation started")
        }
    };
    const handleInputChange = event => {
        setAppName(event.target.value);
    }

    // Handle logs scroll
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({behavior: "smooth"});
        }
    }, [logs]);

    return (<div style={{padding: "20px", fontFamily: "Arial, sans-serif"}}>
        <h1>Create React App</h1>
        <div>
            <input name="App Name" type="text" onChange={handleInputChange} value={appName} style={{
                padding: "10px",
                fontSize: "16px",
                width: "100%",
                maxWidth: "400px",
                margin: "10px 0",
                border: "1px solid #ccc",
                borderRadius: "5px",
                outline: "none",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                transition: "border-color 0.3s, box-shadow 0.3s",
            }}/>
        </div>

        <button
            onClick={handleCreateApp}
            disabled={loading || !appName}
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
                {logs.length > 0 ? (<>
                    {logs.map((log, index) => (<p key={index} style={{margin: "5px 0"}}>
                        {log}
                    </p>))}
                    <div ref={logsEndRef}/>
                </>) : (<p>No logs yet. Click the button to start.</p>)}
            </div>
        </div>
    </div>);
};

export default App;
