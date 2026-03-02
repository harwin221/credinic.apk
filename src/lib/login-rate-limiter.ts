/**
 * Rate limiter específico para intentos de login
 * Previene ataques de fuerza bruta
 */

interface LoginAttempt {
  count: number;
  resetTime: number;
  blocked: boolean;
}

class LoginRateLimiter {
  private attempts = new Map<string, LoginAttempt>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;

  constructor(
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000, // 15 minutos
    blockDurationMs: number = 30 * 60 * 1000 // 30 minutos de bloqueo
  ) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.blockDurationMs = blockDurationMs;
  }

  /**
   * Verifica si se puede intentar login desde esta IP/usuario
   */
  canAttempt(identifier: string): { 
    allowed: boolean; 
    attemptsLeft?: number; 
    resetTime?: number;
    message?: string;
  } {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt) {
      return { allowed: true, attemptsLeft: this.maxAttempts - 1 };
    }

    // Si está bloqueado, verificar si ya pasó el tiempo de bloqueo
    if (attempt.blocked && now < attempt.resetTime) {
      const minutesLeft = Math.ceil((attempt.resetTime - now) / (1000 * 60));
      return { 
        allowed: false, 
        resetTime: attempt.resetTime,
        message: `Cuenta bloqueada. Intente nuevamente en ${minutesLeft} minutos.`
      };
    }

    // Si ya pasó el tiempo de bloqueo, resetear
    if (attempt.blocked && now >= attempt.resetTime) {
      this.attempts.delete(identifier);
      return { allowed: true, attemptsLeft: this.maxAttempts - 1 };
    }

    // Si está dentro de la ventana de tiempo pero no bloqueado
    if (now < attempt.resetTime) {
      const attemptsLeft = this.maxAttempts - attempt.count;
      if (attemptsLeft <= 0) {
        // Bloquear cuenta
        attempt.blocked = true;
        attempt.resetTime = now + this.blockDurationMs;
        const minutesLeft = Math.ceil(this.blockDurationMs / (1000 * 60));
        return { 
          allowed: false, 
          resetTime: attempt.resetTime,
          message: `Demasiados intentos fallidos. Cuenta bloqueada por ${minutesLeft} minutos.`
        };
      }
      return { allowed: true, attemptsLeft };
    }

    // Si ya pasó la ventana de tiempo, resetear
    this.attempts.delete(identifier);
    return { allowed: true, attemptsLeft: this.maxAttempts - 1 };
  }

  /**
   * Registra un intento fallido de login
   */
  recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt || now >= attempt.resetTime) {
      // Nuevo intento o ventana expirada
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
        blocked: false
      });
    } else {
      // Incrementar contador existente
      attempt.count++;
    }
  }

  /**
   * Registra un login exitoso (limpia intentos fallidos)
   */
  recordSuccessfulLogin(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Limpia intentos expirados (mantenimiento)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, attempt] of this.attempts.entries()) {
      if (now >= attempt.resetTime && !attempt.blocked) {
        this.attempts.delete(key);
      }
    }
  }

  /**
   * Obtiene estadísticas del rate limiter
   */
  getStats(): {
    totalAttempts: number;
    blockedIPs: number;
    activeAttempts: number;
  } {
    const now = Date.now();
    let blockedIPs = 0;
    let activeAttempts = 0;

    for (const attempt of this.attempts.values()) {
      if (attempt.blocked && now < attempt.resetTime) {
        blockedIPs++;
      } else if (!attempt.blocked && now < attempt.resetTime) {
        activeAttempts++;
      }
    }

    return {
      totalAttempts: this.attempts.size,
      blockedIPs,
      activeAttempts
    };
  }
}

// Instancia global del rate limiter para login
export const loginRateLimiter = new LoginRateLimiter();

// Ejecutar limpieza cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    loginRateLimiter.cleanup();
  }, 5 * 60 * 1000);
}