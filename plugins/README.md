# Plugins

Source connectors live here. Each plugin is independently versioned and must
implement the Plugin SDK lifecycle (see `docs/PLUGIN_SDK.md`).

Plugins must not access the primary database directly.

First plugins (Milestone 5):

- HTML
- RSS
- ICS
