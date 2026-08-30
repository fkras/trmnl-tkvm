"use client";

import {useState } from "react";
import AnalogClock from "./AnalogClock";
import DigitalClock from "./DigitalClock";
import WeatherWidget from "./WeatherWidget";



export default function MainContent() {
  const SHOW_DIGITAL_SECONDS = false;
  const [isAnalog, setIsAnalog] = useState(false);
 
  return (
    <div className="main-content">
      <WeatherWidget />
      
      <button style={{display: 'none'}} onClick={() => setIsAnalog(!isAnalog)} className="clock-toggle" type="button">
        {isAnalog ? "Shfaq Digital" : "Shfaq Analog"}
      </button>

      <div className="clock-wrapper">
        {isAnalog ? <AnalogClock /> : <DigitalClock showSeconds={SHOW_DIGITAL_SECONDS} />}
      </div>

    </div>
  );
}
