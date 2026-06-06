[doc('Display the list of recipes')]
[private]
default:
    @just --list

[doc('Startes All Services')]
up:
    process-compose up -t
