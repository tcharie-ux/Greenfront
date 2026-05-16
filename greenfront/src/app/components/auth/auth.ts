import { Component } from '@angular/core';
import { Login } from './login/login';
import { Register } from './register/register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [Register, Login],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class Auth {

}
