# SHPE Discord Bot

## Overview

The SHPE Discord Bot manages member attendance, points, events, and Corporate Cabinet progress directly through the SHPE Discord server.

### Example Flow

When a member runs:

`/attendance code:48291`

Discord sends the command to the Node.js bot running on the DigitalOcean server. The bot checks Supabase/PostgreSQL for the event, validates the attendance code, records the member's attendance, and sends a private confirmation back to the member through Discord.

---

## Project Structure

### GitHub

GitHub stores the bot's source code and project history.

When changes are made locally:

1. Push the changes to GitHub.
2. Pull the latest changes onto the Linux server.
3. Restart the bot using PM2.

### DigitalOcean Droplet

The DigitalOcean Droplet is the Linux server that keeps the bot running 24/7.

### Discord Developer Portal

The Discord Developer Portal contains the Discord application and bot configuration.

### Discord Server

The SHPE Discord server is where members and E-board interact with the bot through slash commands.

### Supabase

Supabase is the hosted backend used by the bot.

The bot uses the Supabase JavaScript client to read and write data.

### PostgreSQL

PostgreSQL is the database running inside Supabase.

The main tables include:

* `members`
* `events`
* `attendance`

### Environment Variables

Environment variables on the DigitalOcean Droplet store private credentials and configuration values such as:

* `DISCORD_TOKEN`
* `DISCORD_CLIENT_ID`
* `SUPABASE_URL`
* `SUPABASE_SECRET_KEY`

---

# Commands

## Member Commands

### `/points`

Privately displays a member's:

* Total points
* Number of events attended

### `/leaderboard`

Displays the top 10 members based on total points earned.

### `/events`

Displays upcoming SHPE events.

### `/attendance code:12345`

Checks a member into an event using its unique 5-digit attendance code.

Attendance codes currently expire **2 hours after the event ends**.

### `/codes`

Displays attendance codes for relevant events.

This command can be used to quickly view event attendance codes without having to look them up directly in the database.

---

## E-board Commands

### `/create-event`

Allows E-board members to create a new SHPE event.

Each event stores:

* Name
* Cabinet
* Date and time
* Location
* Description
* Event type
* Point value

Creating an event automatically generates a unique **5-digit attendance code**.

### `/event-attendance code:12345`

Allows E-board members to see which members attended a specific event.

### `/corporate-status`

Allows E-board members to check whether a specific member has attended the required **3 Corporate events**.

### `/corporate-report`

Allows E-board members to view Corporate Cabinet progress for all members at once.

---

# Automated Jobs

Once a week at **12:00 PM**, the bot automatically posts a list of upcoming SHPE events in the announcement channel.

---

# Future Updates

* Connect Google Calendar so creating or editing an event in Discord also creates or updates the event on the SHPE calendar.
* Track whether a member has completed the required number of GBMs.
* Add a command that allows members to view every event they have attended.
* Migrate the bot to new Linux server infrastructure.
* Require members to have the **Cheese role** before they can use member commands.
* Change attendance code expiration rules. Possible options:

  * Expire codes 2 hours after the event starts.
  * Expire codes 30 minutes after the event ends.
* Improve event editing so Discord, Supabase, and Google Calendar stay synchronized.
