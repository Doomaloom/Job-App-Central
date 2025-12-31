# syntax=docker/dockerfile:1

FROM golang:1.25-bookworm AS builder

WORKDIR /src

# Download deps first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Build
COPY . ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/jobapp-backend .

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /out/jobapp-backend ./jobapp-backend
COPY Resume-Stubs ./Resume-Stubs

ENV PORT=8080
EXPOSE 8080

CMD ["./jobapp-backend"]
