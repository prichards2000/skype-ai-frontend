import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("https://skype-ai-translation-jackson.onrender.com");

export default function App() {
  const [recording, setRecording] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("ru");
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    mediaRecorder.current.start();
    setRecording(true);

    mediaRecorder.current.ondataavailable = async (e) => {
      chunks.current.push(e.data);
      if (mediaRecorder.current.state === "inactive") {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();
        socket.emit("audio_chunk", new Uint8Array(arrayBuffer), sourceLang, targetLang);
        chunks.current = [];
      }
    };
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  };

  useEffect(() => {
    socket.on("translated_text", (text) => setTranslatedText(text));
    socket.on("translated_audio", (audioBuffer) => {
      const blob = new Blob([audioBuffer], { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
    });
    return () => {
      socket.off("translated_text");
      socket.off("translated_audio");
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Live Voice Translator</h1>
      <div className="flex gap-4">
        <select className="flex-1 border rounded p-2" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
          <option value="en">English</option>
          <option value="ru">Russian</option>
        </select>
        <select className="flex-1 border rounded p-2" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
          <option value="ru">Russian</option>
          <option value="en">English</option>
        </select>
      </div>
      <div className="flex gap-4">
        <button className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50" onClick={startRecording} disabled={recording}>
          🎙 Start
        </button>
        <button className="w-full bg-gray-500 text-white py-2 rounded disabled:opacity-50" onClick={stopRecording} disabled={!recording}>
          🛑 Stop
        </button>
      </div>
      <div className="border rounded p-4 bg-white shadow">
        <p className="text-sm text-gray-600">Translation:</p>
        <p className="text-lg font-medium mt-1">{translatedText || "...waiting"}</p>
      </div>
    </div>
  );
}