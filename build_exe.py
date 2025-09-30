#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build EXE for DentaDesk License Generator
"""

import os
import subprocess
import sys

def build_exe():
    """Build standalone EXE using PyInstaller"""
    
    print("=" * 60)
    print("Building DentaDesk License Generator EXE")
    print("=" * 60)
    print()
    
    # Check if PyInstaller is installed
    print("[1/4] Checking PyInstaller...")
    try:
        import PyInstaller
        print("✓ PyInstaller is installed")
    except ImportError:
        print("✗ PyInstaller not found, installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"])
        print("✓ PyInstaller installed")
    
    # Install required packages
    print()
    print("[2/4] Installing dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    print("✓ Dependencies installed")
    
    # Build PyInstaller command
    print()
    print("[3/4] Building EXE...")
    
    pyinstaller_args = [
        "pyinstaller",
        "--onefile",                          # Single EXE file
        "--windowed",                         # No console window
        "--name=DentaDesk_License_Generator", # EXE name
        "--icon=icon.ico",                    # Icon (if exists)
        "--add-data=scripts;scripts",         # Include scripts folder
        "--noconsole",                        # No console
        "--clean",                            # Clean cache
        "license_generator_gui.py"
    ]
    
    # If icon doesn't exist, remove icon argument
    if not os.path.exists("icon.ico"):
        pyinstaller_args.remove("--icon=icon.ico")
    
    try:
        subprocess.run(pyinstaller_args, check=True)
        print("✓ EXE built successfully!")
    except subprocess.CalledProcessError as e:
        print(f"✗ Build failed: {e}")
        return False
    
    print()
    print("[4/4] Finalizing...")
    print()
    print("=" * 60)
    print("✓ Build completed successfully!")
    print("=" * 60)
    print()
    print("Your EXE file is located at:")
    print(f"  dist\\DentaDesk_License_Generator.exe")
    print()
    print("You can now:")
    print("  1. Run the EXE directly")
    print("  2. Distribute it to users")
    print("  3. No Python installation required!")
    print()
    
    return True

if __name__ == "__main__":
    try:
        success = build_exe()
        if success:
            print("Press Enter to exit...")
            input()
        else:
            print("Build failed! Press Enter to exit...")
            input()
    except Exception as e:
        print(f"Error: {e}")
        print("Press Enter to exit...")
        input()
