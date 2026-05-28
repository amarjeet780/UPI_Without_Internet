package com.demo.upimesh.controller;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Forwards any unmapped paths (like React Router paths) to the frontend's index.html
 */
@Controller
public class SpaErrorController implements ErrorController {

    @RequestMapping("/error")
    public String handleError(HttpServletRequest request) {
        // Forward to the index.html for React Router to handle the route
        return "forward:/index.html";
    }
}
