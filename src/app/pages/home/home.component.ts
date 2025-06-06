import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { ApiGamesService } from '../../services/api-games.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WishlistService } from '../../services/wishlist.service';
import { ToastService } from '../../services/toast.service';
import { GenreService } from '../../services/genre.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  skeletonArray: number[] = Array.from({ length: 11 }, (_, i) => i);
  list: any = [];
  page: number = 1;
  isLoading: boolean = false;
  selectedGenre: string | null = null;
  selectedGenreName: string | null = null;
  genres: any[] = [];
  isVerticalLayout: boolean = false;
  wishlistGames: string[] = [];

  constructor(
    private _apiGamesService: ApiGamesService,
    private _apiWishlistService: WishlistService,
    private _router: Router,
    private _toastService: ToastService,
    private genreService: GenreService
  ) {}

  ngOnInit(): void {
    // Get genres from API first
    this._apiGamesService.getGenres().subscribe({
      next: (response) => {
        this.genres = response.results;
      },
      error: (err) => console.error('Error loading genres:', err),
    });

    // Subscribe to genre changes
    this.genreService.selectedGenre$.subscribe((genreId) => {
      if (genreId) {
        const genre = this.genres?.find((g) => g.id === genreId);
        this.selectedGenreName = genre?.name || null;
        this.selectedGenre = genreId;
        this.resetAndLoad();
      } else {
        this.selectedGenreName = null;
        this.selectedGenre = null;
        this.resetAndLoad();
      }
    });

    // Initial load
    this.loadMore();
    this.loadWishlist();
  }

  goToGameDetails(slug: string) {
    window.scrollTo(0, 0);
    this._router.navigateByUrl(`games/${slug}`);
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    if (
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 50 &&
      !this.isLoading
    ) {
      this.loadMore();
    }
  }

  orderValue: string = 'Relevance';
  onOrderChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.orderValue = target.value;
    this.resetAndLoad();
  }

  platformValue: string = 'all';
  onPlatformChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.platformValue = target.value;
    this.resetAndLoad();
  }

  onGenreSelected(genreId: string | null) {
    this.selectedGenre = genreId;
    this.resetAndLoad();
  }

  resetAndLoad() {
    this.page = 1;
    this.list = [];
    this.loadMore();
  }

  loadMore() {
    this.isLoading = true;

    if (this.selectedGenre) {
      this._apiGamesService
        .getGamesByGenre(
          this.selectedGenre,
          this.page,
          this.platformValue,
          this.orderValue
        )
        .subscribe({
          next: (res) => {
            const transformedGames = res.results.map((game: any) => ({
              ...game,
              rawgId: game.id,
              backgroundImage: game.background_image,
              background_image: undefined,
            }));
            this.list.push(...transformedGames);
            this.page++;
            this.isLoading = false;
          },
          error: (err) => {
            console.error(err);
            this.isLoading = false;
          },
        });
    } else {
      this._apiGamesService
        .getGames(this.page, this.platformValue, this.orderValue)
        .subscribe({
          next: (res) => {
            this.list.push(...res.data);
            this.page++;
            this.isLoading = false;
          },
          error: (err) => {
            console.error(err);
            this.isLoading = false;
          },
        });
    }
  }

  getGenreName(genreId: string | null): string {
    if (!genreId) return '';
    const genre = this.genres.find((g) => g.id === genreId);
    return genre ? genre.name : '';
  }

  loadWishlist() {
    this._apiWishlistService.showGamesInWishlist().subscribe({
      next: (res) => {
        this.wishlistGames = res['wishlist'] || [];
      },
      error: (err) => {
        console.log('Error loading wishlist:', err);
      },
    });
  }

  addToFav(gameId: string) {
    // First check locally to prevent unnecessary API calls
    if (this.wishlistGames.includes(gameId)) {
      this._toastService.show('Game is already in your wishlist!', 'warning');
      return;
    }

    // Make the API call to add to wishlist
    this._apiWishlistService.addToWishlist(gameId).subscribe({
      next: (res) => {
        console.log('Successfully added to wishlist', res);
        // Update local wishlist only after successful API call
        this.wishlistGames.push(gameId);
        this._toastService.show(
          'Game added to wishlist successfully!',
          'success'
        );
      },
      error: (err) => {
        console.log('Error details:', err);
        if (err.status === 409) {
          this._toastService.show(
            'You already added this game to your wishlist.',
            'error'
          );
          // Update local wishlist to match server state
          this.loadWishlist();
        } else {
          this._toastService.show(
            'You already added this game to your wishlist.',
            'error'
          );
        }
      },
    });
  }
  toggleLayout(isVertical: boolean) {
    this.isVerticalLayout = isVertical;
  }
}
