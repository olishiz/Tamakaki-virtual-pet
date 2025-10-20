# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TamaKaki is a browser-based virtual pet game inspired by modern Tamagotchi devices, created for the UwU Core track at Delulu Hackerhouse Hackathon. It's a pure JavaScript implementation with Canvas-based graphics, featuring pet care, growth mechanics, activities, and customization.

**Core Technologies:**
- Vanilla JavaScript (ES6+)
- HTML5 Canvas for graphics rendering
- Service Worker for offline functionality and caching
- Web Audio API for sound
- LocalStorage/IndexedDB for data persistence

## Development Commands

**No build system - pure static files:**
- The project runs directly in the browser without compilation
- Serve files using any local web server (Live Server, `python -m http.server`, etc.)
- For development, use port 5500 to enable dev mode features

**Asset Generation:**
- `node scripts/pngAssetLister.js` - Regenerates sprite definitions from PNG files in resources/
- This script updates `resources/data/SpriteDefinitions.js` with current asset paths

**Deployment:**
- Copy all files to a web server - no build step required
- Ensure service worker is properly configured for your domain

## Architecture Overview

**Core Application Structure:**
- `App.js` - Main application state, global constants, settings, and data management
- `Main.js` - Application initialization, service worker setup, and UI components
- `Pet.js` - Pet class extending Object2d, handles pet behavior, stats, and animations
- `Scene.js` - Simple scene management wrapper
- `Activities.js` - Pet activity systems (work, school, vacation, etc.)
- `Object2d.js` - Base rendering class for all game objects with sprite support

**Data Layer:**
- `resources/data/CharacterDefinitions.js` - Pet sprite arrays organized by life stage
- `resources/data/SpriteDefinitions.js` - Auto-generated asset paths (don't edit manually)
- `resources/data/SoundDefinitions.js` - Audio file references
- `resources/data/GrowthChart.js` - Pet evolution and care requirements

**Rendering System:**
- Canvas-based 2D rendering with pixel art aesthetics
- Custom sprite system with spritesheet support
- Layered rendering with z-index management
- Custom HTML element `<c-sprite>` for UI sprite display

**Game Logic:**
- Real-time pet simulation with aging, hunger, happiness mechanics
- Care quality affects evolution paths (high/medium/low care)
- Activity system for skill building and story progression
- Furniture and customization system
- Animal and plant companions

**Persistence:**
- Auto-save every 6 seconds using idb-keyval
- Service worker caches all assets for offline play
- User settings stored in localStorage

## Key File Structure

**Core Game Files:**
- `src/` - Main JavaScript modules
- `resources/img/` - Game sprites organized by category (character/, furniture/, ui/, etc.)
- `resources/sounds/` - OGG/MP3 audio files
- `resources/data/` - Game data definitions

**Utility Pages:**
- `growth-chart/` - Standalone pet evolution reference tool
- `blog/` - Static blog pages
- `creator/` - Pet character creator tool

**Asset Management:**
- Character sprites numbered sequentially (chara_1b.png through chara_384b.png)
- Spritesheets for items, foods, and plants in `resources/img/item/`
- UI elements and overlays in `resources/img/ui/`

## Development Notes

**Sprite System:**
- All sprites use the Object2d base class
- Spritesheet animations defined in pet definitions
- Custom sprite element handles automatic cropping and positioning

**Pet Mechanics:**
- Age progression: Baby → Child → Teen → Adult → Elder
- Stats: hunger, happiness, sickness, toilet needs
- Skills: endurance, logic, expression affect evolution
- Care quality determines available evolution paths

**Audio System:**
- Uses AudioChannel class with Web Audio API
- Supports OGG and MP3 formats
- Sound preloading and caching

**State Management:**
- All game state stored in App object
- Settings in App.settings
- Pet data in petDefinition objects
- Save system handles serialization of complex objects

When modifying the game, maintain the existing sprite conventions, follow the Object2d pattern for new game objects, and ensure any new assets are properly added to the relevant definition files.