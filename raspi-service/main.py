#!/usr/bin/env python3
"""
Control Home — Raspberry Pi 5 Service
Conecta a cámaras Dahua, detecta rostros y uso de celular.
Envía eventos al dashboard web vía API.

Requisitos:
  pip install opencv-python face_recognition numpy requests pillow

Uso:
  python3 main.py
"""

import cv2
import time
import json
import os
import sys
import threading
import signal
from datetime import datetime
from typing import Optional
import requests
import numpy as np

# ── Configuración ─────────────────────────────────────────────
API_URL = os.getenv("CONTROL_HOME_API_URL", "https://control-home.vercel.app")
API_SECRET = os.getenv("CONTROL_HOME_SECRET", "ch_secret_2026")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

DETECTION_INTERVAL = 2  # segundos entre cada análisis
FACE_TOLERANCE = 0.55   # menor = más estricto
PHONE_SESSION_TIMEOUT = 120  # segundos sin ver celular para cerrar sesión

running = True

def signal_handler(sig, frame):
    global running
    print("\n🛑 Deteniendo servicio...")
    running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


# ── Carga de datos desde Supabase ─────────────────────────────
def load_cameras():
    """Carga las cámaras configuradas desde Supabase."""
    try:
        headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/home_cameras?is_active=eq.true",
            headers=headers
        )
        return res.json() if res.status_code == 200 else []
    except Exception as e:
        print(f"❌ Error cargando cámaras: {e}")
        return []


def load_persons():
    """Carga personas autorizadas con sus encodings faciales."""
    try:
        headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/home_persons?is_active=eq.true",
            headers=headers
        )
        persons = res.json() if res.status_code == 200 else []
        
        known_encodings = []
        known_names = []
        known_ids = []
        
        for p in persons:
            encodings = p.get("face_encodings", [])
            if isinstance(encodings, str):
                encodings = json.loads(encodings)
            for enc in encodings:
                known_encodings.append(np.array(enc))
                known_names.append(p["name"])
                known_ids.append(p["id"])
        
        return persons, known_encodings, known_names, known_ids
    except Exception as e:
        print(f"❌ Error cargando personas: {e}")
        return [], [], [], []


# ── Envío de eventos ──────────────────────────────────────────
def send_event(event_type, person_name, camera_name, confidence=None, 
               person_id=None, is_known=True, photo_path=None):
    """Envía un evento de presencia al dashboard."""
    try:
        headers = {
            "apikey": SUPABASE_KEY, 
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        
        payload = {
            "event_type": event_type,
            "person_name": person_name,
            "camera_name": camera_name,
            "confidence": confidence,
            "person_id": person_id,
            "is_known": is_known,
            "event_time": datetime.now().isoformat()
        }
        
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/home_presence_events",
            headers=headers,
            json=payload
        )
        
        emoji = "🟢" if is_known else "🔴"
        print(f"  {emoji} Evento: {event_type} | {person_name} | {camera_name} | conf: {confidence:.0%}" if confidence else
              f"  {emoji} Evento: {event_type} | {person_name} | {camera_name}")
              
    except Exception as e:
        print(f"  ❌ Error enviando evento: {e}")


# ── Procesador de cámara ──────────────────────────────────────
class CameraProcessor:
    """Procesa frames de una cámara: detección facial + celular."""
    
    def __init__(self, camera_config, known_encodings, known_names, known_ids):
        self.camera = camera_config
        self.name = camera_config["name"]
        self.rtsp_url = camera_config["rtsp_url"]
        self.known_encodings = known_encodings
        self.known_names = known_names
        self.known_ids = known_ids
        self.cap = None
        self.last_detection = {}  # person_name -> last_seen timestamp
        self.phone_sessions = {}  # person_name -> session_start
        self.reconnect_delay = 5
        
    def connect(self):
        """Conecta a la cámara vía RTSP."""
        try:
            self.cap = cv2.VideoCapture(self.rtsp_url)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            if self.cap.isOpened():
                print(f"  📹 {self.name}: Conectada")
                self.reconnect_delay = 5
                return True
            else:
                print(f"  ❌ {self.name}: No se pudo conectar")
                return False
        except Exception as e:
            print(f"  ❌ {self.name}: Error de conexión: {e}")
            return False
    
    def grab_frame(self):
        """Captura un frame de la cámara."""
        if not self.cap or not self.cap.isOpened():
            if not self.connect():
                time.sleep(self.reconnect_delay)
                self.reconnect_delay = min(60, self.reconnect_delay * 2)
                return None
        
        ret, frame = self.cap.read()
        if not ret:
            print(f"  ⚠️  {self.name}: Frame perdido, reconectando...")
            self.cap.release()
            self.cap = None
            return None
        
        return frame
    
    def detect_faces(self, frame):
        """Detecta y reconoce rostros en el frame."""
        try:
            import face_recognition
            
            # Reducir tamaño para velocidad
            small = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            rgb_small = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
            
            # Detectar rostros
            locations = face_recognition.face_locations(rgb_small, model="hog")
            encodings = face_recognition.face_encodings(rgb_small, locations)
            
            for encoding in encodings:
                if len(self.known_encodings) == 0:
                    # No hay personas registradas
                    self._handle_detection("Desconocido", None, 0, False)
                    continue
                
                # Comparar con personas conocidas
                distances = face_recognition.face_distance(self.known_encodings, encoding)
                best_idx = np.argmin(distances)
                best_distance = distances[best_idx]
                
                if best_distance < FACE_TOLERANCE:
                    name = self.known_names[best_idx]
                    person_id = self.known_ids[best_idx]
                    confidence = 1.0 - best_distance
                    self._handle_detection(name, person_id, confidence, True)
                else:
                    self._handle_detection("Desconocido", None, 1.0 - best_distance, False)
                    
        except ImportError:
            print("  ⚠️  face_recognition no instalado. Saltando detección facial.")
        except Exception as e:
            print(f"  ❌ Error en detección facial: {e}")
    
    def _handle_detection(self, name, person_id, confidence, is_known):
        """Maneja una detección, evitando spam de eventos."""
        now = time.time()
        last = self.last_detection.get(name, 0)
        
        # Solo enviar evento si pasaron más de 5 minutos desde la última detección
        if now - last > 300:
            event_type = "detected" if is_known else "unknown_person"
            send_event(event_type, name, self.name, confidence, person_id, is_known)
            self.last_detection[name] = now
    
    def release(self):
        """Libera la conexión."""
        if self.cap:
            self.cap.release()


# ── Loop principal ────────────────────────────────────────────
def main():
    print("=" * 60)
    print("🏠 CONTROL HOME — Raspberry Pi 5 Service")
    print("=" * 60)
    print(f"⏰ Iniciado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔄 Intervalo de detección: {DETECTION_INTERVAL}s")
    print()
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Falta configurar SUPABASE_URL y SUPABASE_KEY")
        print("   Ejecutar:")
        print("   export SUPABASE_URL=https://xxx.supabase.co")
        print("   export SUPABASE_KEY=sb_secret_xxx")
        sys.exit(1)
    
    # Cargar datos
    print("📂 Cargando configuración...")
    cameras = load_cameras()
    persons, known_encodings, known_names, known_ids = load_persons()
    
    print(f"  📹 {len(cameras)} cámara(s) configuradas")
    print(f"  👤 {len(persons)} persona(s) autorizadas")
    print(f"  🧬 {len(known_encodings)} encoding(s) faciales")
    print()
    
    if not cameras:
        print("⚠️  No hay cámaras configuradas. Agregá cámaras desde el dashboard web.")
        print("   Esperando configuración...")
        while running:
            time.sleep(30)
            cameras = load_cameras()
            if cameras:
                break
    
    # Crear procesadores
    processors = []
    for cam in cameras:
        proc = CameraProcessor(cam, known_encodings, known_names, known_ids)
        processors.append(proc)
    
    print("🚀 Iniciando procesamiento de cámaras...")
    print("-" * 60)
    
    # Recargar personas cada 5 minutos
    last_reload = time.time()
    
    while running:
        for proc in processors:
            if not running:
                break
            
            frame = proc.grab_frame()
            if frame is not None:
                proc.detect_faces(frame)
        
        # Recargar personas periódicamente
        if time.time() - last_reload > 300:
            _, known_encodings, known_names, known_ids = load_persons()
            for proc in processors:
                proc.known_encodings = known_encodings
                proc.known_names = known_names
                proc.known_ids = known_ids
            last_reload = time.time()
            print(f"🔄 Personas recargadas ({len(known_names)} encodings)")
        
        time.sleep(DETECTION_INTERVAL)
    
    # Limpieza
    for proc in processors:
        proc.release()
    
    print("\n✅ Servicio detenido correctamente")


if __name__ == "__main__":
    main()
