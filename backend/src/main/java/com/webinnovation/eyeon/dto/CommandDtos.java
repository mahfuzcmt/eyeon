package com.webinnovation.eyeon.dto;

public final class CommandDtos {

    private CommandDtos() {}

    public record CommandRequest(String devicePassword, String rawCommand) {}

    /** Optional body of the live / find actions. */
    public record TrackerActionRequest(Integer seconds) {}

    public record CommandResponse(boolean ok, String reply, String error) {
        public static CommandResponse success(String reply) {
            return new CommandResponse(true, reply, null);
        }
        public static CommandResponse failure(String error) {
            return new CommandResponse(false, null, error);
        }
    }
}
