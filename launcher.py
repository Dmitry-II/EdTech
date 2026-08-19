import customtkinter as ctk
import subprocess
import json
import os
import sys
import threading
import webbrowser
import re

# ==========================================
# НАСТРОЙКИ ПРОГРАММЫ
# Впиши сюда точное название твоего файла иконки
ICON_FILE = "my_logo.ico"
# ==========================================

ctk.set_appearance_mode("dark")
ctk.set_window_scaling(1.0)
ctk.set_widget_scaling(1.0)

# Функция для правильной работы файлов после сборки в .exe
def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title("EdTech Launcher")
        self.geometry("450x500")
        self.resizable(False, False)
        self.configure(fg_color="#0a0c10")
        
        # --- УСТАНОВКА ИКОНКИ ОКНА ---
        try:
            self.iconbitmap(resource_path(ICON_FILE))
        except Exception:
            pass # Если файла нет, программа запустится со стандартной иконкой
            
        self.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        self.vite_proc = None
        self.serveo_proc = None
        self.is_running = False

        # --- ВЕРХНЯЯ ЧАСТЬ (Текст и поле ввода) ---
        self.label = ctk.CTkLabel(
            self, 
            text="Введите любой допустимый уникальный домен:", 
            text_color="#8b949e",
            font=("Arial", 14)
        )
        self.label.pack(pady=(40, 10))

        self.domain_var = ctk.StringVar()
        self.domain_var.trace_add("write", self.validate_input)

        self.domain_entry = ctk.CTkEntry(
            self, 
            width=320, 
            height=40,
            textvariable=self.domain_var, 
            corner_radius=20,
            border_width=2,
            border_color="#4ade80",
            fg_color="#0a0c10",
            bg_color="#0a0c10", 
            text_color="#4ade80",
            justify="center",
            font=("Arial", 16)
        )
        self.domain_entry.pack(pady=5)

        # --- ЦЕНТРАЛЬНАЯ ЧАСТЬ (Интерактивный текст) ---
        self.btn_main = ctk.CTkButton(
            self, 
            text="▷ Запустить", 
            width=200, 
            height=60, 
            corner_radius=0, 
            border_width=0, 
            fg_color="transparent", 
            bg_color="#0a0c10",
            hover_color="#0f141a", 
            text_color="#4ade80",
            font=("Arial", 36, "bold"), 
            command=self.toggle_server
        )
        self.btn_main.place(relx=0.5, rely=0.5, anchor="center")

        # --- ТЕКСТ ОШИБКИ ---
        self.error_label = ctk.CTkLabel(
            self, 
            text="", 
            text_color="#ef4444", 
            font=("Arial", 14, "bold")
        )
        self.error_label.place(relx=0.5, rely=0.75, anchor="center")

        # --- НИЖНЯЯ ЧАСТЬ (Ссылка) ---
        self.btn_open = ctk.CTkButton(
            self, 
            text="Открыть сайт в браузере ((•))", 
            fg_color="transparent", 
            bg_color="#0a0c10",
            text_color="#4ade80",
            hover_color="#0f141a",
            font=("Arial", 14, "underline"),
            command=self.open_browser
        )
        self.btn_open.place(relx=0.95, rely=0.95, anchor="se")

        self.load_settings()

    def validate_input(self, *args):
        if self.is_running:
            return

        text = self.domain_var.get().strip()
        
        if not text:
            self.error_label.configure(text="")
            self.domain_entry.configure(border_color="#4ade80", text_color="#4ade80")
            self.btn_main.configure(state="disabled", text_color="#334155")
            return

        if "http" in text or "." in text or "/" in text:
            self.error_label.configure(text="Вводите только название домена без ссылок и точек")
            self.domain_entry.configure(border_color="#ef4444", text_color="#ef4444")
            self.btn_main.configure(state="disabled", text_color="#334155")
            return
            
        if not re.match(r"^[a-zA-Z0-9\-]+$", text):
            self.error_label.configure(text="Допустимы только английские буквы, цифры и дефис")
            self.domain_entry.configure(border_color="#ef4444", text_color="#ef4444")
            self.btn_main.configure(state="disabled", text_color="#334155")
            return
            
        self.error_label.configure(text="")
        self.domain_entry.configure(border_color="#4ade80", text_color="#4ade80")
        self.btn_main.configure(state="normal", text_color="#4ade80")

    def show_error(self, message):
        def update():
            self.error_label.configure(text=message)
        self.after(0, update)

    def set_button_ui(self, state):
        def update():
            if state == "loading":
                self.btn_main.configure(text="Запуск...", text_color="#eab308")
            elif state == "running":
                self.btn_main.configure(text="Остановить ⏹", text_color="#ef4444")
            elif state == "stopped":
                self.btn_main.configure(text="▷ Запустить", text_color="#4ade80")
                self.validate_input()
        self.after(0, update)

    def get_clean_domain(self):
        return self.domain_var.get().strip().lower()

    def load_settings(self):
        if os.path.exists("config.json"):
            try:
                with open("config.json", "r") as f:
                    data = json.load(f)
                    self.domain_var.set(data.get("domain", ""))
            except:
                pass

    def save_settings(self):
        data = {"domain": self.get_clean_domain()}
        with open("config.json", "w") as f:
            json.dump(data, f)

    def open_browser(self):
        domain = self.get_clean_domain()
        if domain:
            url = f"https://{domain}.serveousercontent.com/"
            webbrowser.open(url)

    def toggle_server(self):
        if self.is_running:
            self.stop_all()
        else:
            self.start_threads()

    def start_threads(self):
        self.is_running = True
        self.set_button_ui("loading")
        self.error_label.configure(text="")
        threading.Thread(target=self.start_all, daemon=True).start()

    def start_all(self):
        self.save_settings()
        domain = self.get_clean_domain()

        try:
            result = subprocess.run("py generate_course.py", shell=True, capture_output=True, text=True, errors="replace")
            
            if result.returncode != 0:
                err_text = result.stderr if result.stderr else result.stdout
                short_err = err_text.strip().split("\n")[-1][:50]
                self.show_error(f"Ошибка индексации: {short_err}")
                self.after(0, self.stop_all)
                return
            
            creation_flags = subprocess.CREATE_NEW_CONSOLE

            self.vite_proc = subprocess.Popen("npx vite --host", shell=True, creationflags=creation_flags)

            cmd = f"ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R {domain}:80:localhost:5173 serveo.net"
            self.serveo_proc = subprocess.Popen(cmd, shell=True, creationflags=creation_flags)
            
            self.set_button_ui("running")
            
        except Exception as e:
            self.show_error("Системная ошибка при запуске процессов")
            self.after(0, self.stop_all)

    def stop_all(self):
        try:
            subprocess.run("taskkill /F /IM node.exe", shell=True, capture_output=True)
            subprocess.run("taskkill /F /IM ssh.exe", shell=True, capture_output=True)
        except:
            pass
        
        self.vite_proc = None
        self.serveo_proc = None
        self.is_running = False
        
        self.set_button_ui("stopped")

    def on_closing(self):
        try:
            subprocess.run("taskkill /F /IM node.exe", shell=True, capture_output=True)
            subprocess.run("taskkill /F /IM ssh.exe", shell=True, capture_output=True)
        except:
            pass
        self.destroy()

if __name__ == "__main__":
    app = App()
    app.mainloop()