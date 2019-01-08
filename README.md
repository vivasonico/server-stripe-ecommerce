# STRIPE FIREBASE SENDGRID TEXTMAGIC

I just got my hands on this old version of a node server for handling payments for an ecommerce. I'm no longer maintaining the server, and this was not the complete version. However, I remember struggling to find information on how to handle Stripe if you wanted to enable saving card feature.
In the end, /chargemaster handles every use case. I remember struggling as well since Stripe only allows you to use certain variables once. I also remember the difficulty to combine variables from different promises (solved by helper funcitons).
This code is not complete, and you should not take it as a starter. However, it can handle the following:

Stripe: Creating customers, saving cards, retrieving cards, handling payments and saving them to FireBase

SendGrid: Sending automatic email based on a template after each purchase. It's set up to send a second email.

TextMagic: We were changing the system at our restaurant, so we set it up to receive an SMS on each order while they were developing the integration API.

Firebase: Everything was saved to firebase as a central DB.

Feel free to check it out. I'm publishing because it solves some issues I found were poorly documented.

If you want to try it out, some endpoints are there fore testing

--> Change stripe KEY
--> Add your firebase ID and serviceAccount JSON
--> Same for sendgrid and TextMagic

I've replaced the variables with YOUR or PASTE so you can easily find them by searching those words.
gl hf
