.PHONY: up down build run logs

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

run: build up
	@echo ""
	@echo "ASTRIKS is running."
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:3000"
	@echo "  MySQL:    localhost:3306 (user: telephony, pass: telephony)"
	@echo ""
	@echo "Run 'make logs' to follow logs, or 'make down' to stop."

logs:
	docker compose logs -f
