#lang racket

(define (change b a)
  (set-box! b a))

(define a (box #f))
(define b (box #f))

(equal? a b)
(eqv? a b)

(equal? (unbox a) #f)
(equal? (unbox a) #f)

(set-box! a 42)
(equal? (unbox a) 42)

(change a 100)
(change b 200)

(equal? (unbox a) 100)
(equal? (unbox b) 200)

(equal? (unbox #&10) 10)
(equal? (unbox #&(1 2 3 4)) '(1 2 3 4))
(equal? (hash-ref (unbox #&#hash((1 . 2) (3 . 4))) 3) 4)
